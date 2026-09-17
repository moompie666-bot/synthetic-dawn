// The story interpreter is independent of the DOM, storage and presentation timers.
export const SCHEMA_VERSION = 2;
export const clone = (value) => JSON.parse(JSON.stringify(value));
export function matches(condition, state) {
  if (!condition) return true;
  if (condition.all) return condition.all.every((c) => matches(c, state));
  if (condition.any) return condition.any.some((c) => matches(c, state));
  if (condition.not) return !matches(condition.not, state);
  if (condition.clue) return state.clues.includes(condition.clue);
  if (condition.flag)
    return state.flags[condition.flag] === (condition.equals ?? true);
  throw new Error("Unknown condition: " + JSON.stringify(condition));
}
function validateCondition(c, story) {
  if (!c) return;
  if (c.all || c.any) {
    (c.all || c.any).forEach((v) => validateCondition(v, story));
    return;
  }
  if (c.not) return validateCondition(c.not, story);
  if (c.clue && story.clues[c.clue]) return;
  if (c.flag && story.flags.includes(c.flag)) return;
  throw new Error("Invalid condition: " + JSON.stringify(c));
}
export function validateStory(story) {
  const nodes = story.nodes;
  if (!nodes?.[story.entry]) throw new Error("Missing story entry");
  const types = new Set(["scene", "say", "choice", "effect", "branch", "end"]);
  const targets = (node) =>
    node.type === "choice"
      ? node.options.map((o) => o.target)
      : node.type === "branch"
        ? [node.yes, node.no]
        : node.type === "end"
          ? []
          : [node.next];
  const effectCheck = (e) => {
    for (const key of Object.keys(e?.flags || {}))
      if (!story.flags.includes(key)) throw new Error("Unknown flag " + key);
    for (const clue of e?.clues || [])
      if (!story.clues[clue]) throw new Error("Unknown clue " + clue);
    for (const cg of e?.cg || [])
      if (!story.assets.cg[cg]) throw new Error("Unknown CG " + cg);
  };
  for (const [id, n] of Object.entries(nodes)) {
    if (id !== n.id || !types.has(n.type))
      throw new Error("Invalid node " + id);
    for (const target of targets(n))
      if (!target || !nodes[target])
        throw new Error(`Missing target ${id} -> ${target}`);
    if (n.type === "say" && (!n.text || !story.characters[n.speaker]))
      throw new Error("Invalid dialogue " + id);
    if (n.type === "choice") {
      if (
        n.options.length < 2 ||
        new Set(n.options.map((o) => o.id)).size !== n.options.length
      )
        throw new Error("Invalid options " + id);
      if (!n.options.some((o) => !o.when))
        throw new Error("Choice needs an unconditional exit: " + id);
      n.options.forEach((o) => {
        validateCondition(o.when, story);
        effectCheck(o.effects);
      });
    }
    if (n.type === "branch") validateCondition(n.when, story);
    if (n.type === "scene") {
      if (!story.assets.backgrounds[n.art.bg])
        throw new Error("Unknown background " + id);
      for (const s of n.art.sprites || []) {
        if (
          !story.assets.characters[s.character]?.[s.costume] ||
          !["left", "right", "center"].includes(s.slot) ||
          !s.expression ||
          !s.pose
        )
          throw new Error("Invalid sprite " + id);
      }
      if (!story.chapters[n.chapter]) throw new Error("Unknown chapter " + id);
      if (n.art.cg && !story.assets.cg[n.art.cg])
        throw new Error("Unknown scene CG " + id);
      if (n.audio?.music && !story.assets.music[n.audio.music])
        throw new Error("Unknown music " + id);
    }
    if (
      n.type === "end" &&
      (!n.title || !n.summary || !["demo", "bad"].includes(n.kind))
    )
      throw new Error("Invalid ending " + id);
    effectCheck(n.effects);
  }
  const visited = new Set(),
    pending = [story.entry];
  while (pending.length) {
    const id = pending.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...targets(nodes[id]));
  }
  const unreachable = Object.keys(nodes).filter((id) => !visited.has(id));
  if (unreachable.length)
    throw new Error("Unreachable nodes: " + unreachable.join(", "));
  return {
    nodes: visited.size,
    choices: Object.values(nodes).filter((n) => n.type === "choice").length,
  };
}
export class StoryEngine {
  constructor(story) {
    this.story = story;
    this.state = {
      nodeId: story.entry,
      chapter: "awakening",
      route: null,
      flags: {},
      relations: { kai: 0, lyra: 0, zhao: 0 },
      clues: [],
      cg: [],
      visitedChapters: [],
      art: { bg: "lab_dark", sprites: [], cg: null },
      audio: { music: null, ambience: null },
    };
    this.log = [];
    this.backstack = [];
    this.settle();
  }
  get current() {
    const n = this.story.nodes[this.state.nodeId];
    if (!n) throw new Error("剧情节点不存在：" + this.state.nodeId);
    return n;
  }
  options() {
    return this.current.type === "choice"
      ? this.current.options.filter((o) => matches(o.when, this.state))
      : [];
  }
  apply(e = {}) {
    Object.assign(this.state.flags, e.flags || {});
    if (e.route) this.state.route = e.route;
    for (const [k, v] of Object.entries(e.relations || {}))
      this.state.relations[k] = (this.state.relations[k] || 0) + v;
    for (const c of e.clues || [])
      if (!this.state.clues.includes(c)) this.state.clues.push(c);
    for (const c of e.cg || [])
      if (!this.state.cg.includes(c)) this.state.cg.push(c);
  }
  settle() {
    for (let steps = 0; steps < 300; steps++) {
      const n = this.current;
      if (["say", "choice", "end"].includes(n.type)) return;
      if (n.type === "scene") {
        this.state.art = clone(n.art);
        this.state.audio = clone(n.audio || { music: null, ambience: null });
        this.state.chapter = n.chapter;
        if (!this.state.visitedChapters.includes(n.chapter))
          this.state.visitedChapters.push(n.chapter);
      }
      this.apply(n.effects);
      this.state.nodeId =
        n.type === "branch"
          ? matches(n.when, this.state)
            ? n.yes
            : n.no
          : n.next;
    }
    throw new Error("剧情跳转超过安全上限；进度已保留。");
  }
  checkpoint() {
    this.backstack.push({
      state: clone(this.state),
      logLength: this.log.length,
    });
    if (this.backstack.length > 100) this.backstack.shift();
  }
  next() {
    const n = this.current;
    if (n.type !== "say") return false;
    this.checkpoint();
    this.log.push({
      nodeId: n.id,
      type: "say",
      speaker: n.speaker,
      text: n.text,
    });
    this.state.nodeId = n.next;
    this.settle();
    return true;
  }
  choose(id) {
    if (this.current.type !== "choice") return false;
    const option = this.options().find((o) => o.id === id);
    if (!option) throw new Error("当前条件下无法选择该选项。");
    this.checkpoint();
    this.log.push({
      nodeId: this.current.id,
      type: "choice",
      text: option.text,
      optionId: id,
    });
    this.apply(option.effects);
    this.state.nodeId = option.target;
    this.settle();
    return true;
  }
  back() {
    const checkpoint = this.backstack.pop();
    if (!checkpoint) return false;
    this.state = clone(checkpoint.state);
    this.log.length = checkpoint.logLength;
    return true;
  }
  snapshot() {
    return {
      schemaVersion: SCHEMA_VERSION,
      storyVersion: this.story.version,
      nodeId: this.state.nodeId,
      state: clone(this.state),
      log: clone(this.log),
      backstack: clone(this.backstack),
    };
  }
  restore(snapshot) {
    if (
      snapshot?.schemaVersion !== SCHEMA_VERSION ||
      snapshot.storyVersion !== this.story.version
    )
      throw new Error("此存档与当前剧本版本不兼容。原存档未被修改。");
    const validateState = (s) => {
      if (
        !s ||
        !this.story.nodes[s.nodeId] ||
        !["say", "choice", "end"].includes(this.story.nodes[s.nodeId].type) ||
        !this.story.chapters[s.chapter]
      )
        throw new Error("存档位置无效。");
      if (
        !s.flags ||
        !s.relations ||
        !s.art ||
        !s.audio ||
        !Array.isArray(s.clues) ||
        !Array.isArray(s.cg) ||
        !Array.isArray(s.visitedChapters)
      )
        throw new Error("存档数据不完整。");
      if (
        !this.story.assets.backgrounds[s.art.bg] ||
        s.clues.some((c) => !this.story.clues[c]) ||
        s.cg.some((c) => !this.story.assets.cg[c])
      )
        throw new Error("存档资源无效。");
      if (
        !Array.isArray(s.art.sprites) ||
        s.art.sprites.some(
          (p) => !this.story.assets.characters[p.character]?.[p.costume],
        )
      )
        throw new Error("存档立绘无效。");
      if (
        Object.keys(s.flags).some((k) => !this.story.flags.includes(k)) ||
        Object.values(s.relations).some((v) => !Number.isFinite(v))
      )
        throw new Error("存档人物状态无效。");
      if (
        s.visitedChapters.some((c) => !this.story.chapters[c]) ||
        ![null, "kai", "lyra", "wanderer"].includes(s.route)
      )
        throw new Error("存档章节状态无效。");
      if (
        (s.audio.music && !this.story.assets.music[s.audio.music]) ||
        (s.art.cg && !this.story.assets.cg[s.art.cg])
      )
        throw new Error("存档演出状态无效。");
      if (
        s.art.sprites.some(
          (p) =>
            !["left", "right", "center"].includes(p.slot) ||
            typeof p.expression !== "string" ||
            typeof p.pose !== "string",
        )
      )
        throw new Error("存档人物位置无效。");
    };
    if (
      snapshot.nodeId !== snapshot.state?.nodeId ||
      !Array.isArray(snapshot.log) ||
      !Array.isArray(snapshot.backstack) ||
      snapshot.backstack.length > 100
    )
      throw new Error("存档格式无效。");
    validateState(snapshot.state);
    for (const entry of snapshot.log)
      if (!this.story.nodes[entry.nodeId] || typeof entry.text !== "string")
        throw new Error("存档历史无效。");
    for (const p of snapshot.backstack) {
      validateState(p.state);
      if (
        !Number.isInteger(p.logLength) ||
        p.logLength < 0 ||
        p.logLength > snapshot.log.length
      )
        throw new Error("存档回退记录无效。");
    }
    this.state = clone(snapshot.state);
    this.log = clone(snapshot.log);
    this.backstack = clone(snapshot.backstack);
  }
}
