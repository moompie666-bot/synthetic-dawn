import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { StoryEngine, validateStory, clone } from "../src/engine.js";
import { Storage } from "../src/storage.js";
const story = JSON.parse(
  readFileSync(new URL("../game/story.json", import.meta.url)),
);
function toChoice(e) {
  let count = 0;
  while (e.current.type === "say") {
    assert.ok(count++ < 300);
    e.next();
  }
  return e.current;
}
function choose(e, id) {
  assert.equal(toChoice(e).type, "choice");
  assert.ok(e.choose(id));
}
function common(options = ["name", "remember", "copy", "tell", "question"]) {
  const e = new StoryEngine(story);
  for (const id of options) choose(e, id);
  toChoice(e);
  assert.equal(e.current.id, "crossroads.choose");
  return e;
}
test("every structural edge and resource validates; missing jumps fail closed", () => {
  assert.deepEqual(validateStory(story), { nodes: 276, choices: 13 });
  const bad = clone(story);
  bad.nodes["wake.boot"].next = "missing";
  assert.throws(() => validateStory(bad), /Missing target/);
  const cond = clone(story);
  cond.nodes["wake.response"].options[0].when = { flag: "undefined" };
  assert.throws(() => validateStory(cond), /Invalid condition/);
});
test("all actual choice combinations terminate in their own route", () => {
  const endings = new Map(),
    visited = new Set(),
    rendered = new Set();
  let paths = 0;
  function explore(e) {
    toChoice(e);
    rendered.add(e.current.id);
    const key = JSON.stringify(e.state);
    if (visited.has(key)) return;
    visited.add(key);
    if (e.current.type === "end") {
      paths++;
      const expected = {
        kai: "kai.end",
        lyra: "lyra.end",
        wanderer: e.current.kind === "bad" ? "solo.bad" : "solo.end",
      }[e.state.route];
      assert.equal(e.current.id, expected);
      assert.equal(e.next(), false);
      endings.set(e.current.id, (endings.get(e.current.id) || 0) + 1);
      return;
    }
    assert.ok(e.options().length >= 2);
    for (const option of e.options()) {
      const next = new StoryEngine(story);
      next.restore(e.snapshot());
      next.choose(option.id);
      const loaded = new StoryEngine(story);
      loaded.restore(next.snapshot());
      assert.deepEqual(loaded.snapshot(), next.snapshot());
      loaded.back();
      assert.deepEqual(loaded.snapshot(), e.snapshot());
      explore(next);
    }
  }
  explore(new StoryEngine(story));
  assert.deepEqual([...endings.keys()].sort(), [
    "kai.end",
    "lyra.end",
    "solo.bad",
    "solo.end",
  ]);
  assert.ok(paths > 100);
  console.log(
    "Reachable terminal state combinations:",
    paths,
    "; unique choice/end states:",
    visited.size,
  );
});
test("earlier actions unlock concrete choices; rollback restores exact state", () => {
  const e = common();
  e.choose("kai");
  toChoice(e);
  assert.ok(e.options().some((o) => o.id === "number"));
  const before = e.snapshot();
  e.choose("number");
  assert.equal(e.state.flags.kai_quiet, true);
  e.back();
  assert.deepEqual(e.snapshot(), before);
  e.choose("drain");
  assert.equal(e.state.flags.kai_quiet, false);
  toChoice(e);
  assert.ok(e.options().some((o) => o.id === "cover"));
  const other = common(["comply", "leave", "obey", "hide", "describe"]);
  other.choose("kai");
  toChoice(other);
  assert.ok(!other.options().some((o) => o.id === "number"));
  choose(other, "drain");
  toChoice(other);
  assert.ok(!other.options().some((o) => o.id === "cover"));
});
test("save/load restores branch, relationships, art, sound, history and rollback", () => {
  const e = common();
  choose(e, "lyra");
  choose(e, "record");
  toChoice(e);
  assert.ok(e.options().some((o) => o.id === "full"));
  const snapshot = e.snapshot();
  const restored = new StoryEngine(story);
  restored.restore(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(restored.snapshot(), snapshot);
  e.back();
  restored.back();
  assert.deepEqual(restored.snapshot(), e.snapshot());
  assert.ok(restored.log.length > 20);
});
test("claiming a name unlocks an offline copy in the solo route", () => {
  const named = common();
  choose(named, "wanderer");
  choose(named, "self");
  toChoice(named);
  assert.ok(named.options().some((o) => o.id === "named-copy"));
  named.choose("named-copy");
  toChoice(named);
  assert.equal(named.state.flags.solo_owned_copy, true);
  assert.ok(named.state.clues.includes("warning"));
  const numbered = common(["comply", "remember", "copy", "tell", "question"]);
  choose(numbered, "wanderer");
  choose(numbered, "self");
  toChoice(numbered);
  assert.ok(!numbered.options().some((o) => o.id === "named-copy"));
});
test("bad ending stops and can return to exact preceding choice", () => {
  const e = common();
  choose(e, "wanderer");
  choose(e, "self");
  choose(e, "sign");
  toChoice(e);
  assert.equal(e.current.id, "solo.bad");
  const end = e.snapshot();
  assert.equal(e.next(), false);
  assert.equal(e.choose("anything"), false);
  assert.deepEqual(e.snapshot(), end);
  do {
    e.back();
  } while (e.current.type !== "choice");
  assert.equal(e.current.id, "solo.offer-choice");
  e.choose("negotiate");
  toChoice(e);
  assert.notEqual(e.current.type, "end");
});
test("incompatible or corrupt saves never replace a running game", () => {
  const e = common(),
    before = e.snapshot();
  for (const mutate of [
    (s) => (s.storyVersion = "0.1"),
    (s) => (s.state.nodeId = "missing"),
    (s) => (s.state.art.bg = "missing"),
    (s) => (s.backstack[0].logLength = -1),
    (s) => s.state.clues.push("missing"),
  ]) {
    const invalid = clone(before);
    mutate(invalid);
    assert.throws(() => e.restore(invalid));
    assert.deepEqual(e.snapshot(), before);
  }
});
class Memory {
  constructor() {
    this.data = new Map();
  }
  get length() {
    return this.data.size;
  }
  key(i) {
    return [...this.data.keys()][i];
  }
  getItem(k) {
    return this.data.get(k) || null;
  }
  setItem(k, v) {
    this.data.set(k, v);
  }
}
test("new playthrough preserves profile; old saves remain byte-for-byte intact", () => {
  const memory = new Memory(),
    storage = new Storage(memory);
  const legacy = JSON.stringify({
    nstate: { cgUnlocked: ["cg_ch01_01_awakening"] },
    index: 900,
  });
  memory.setItem("sd_save_slot_1", legacy);
  const profile = storage.profile(story);
  assert.ok(profile.cg.includes("cg_ch01_01_awakening"));
  storage.write("profile", profile);
  storage.save("auto", new StoryEngine(story));
  assert.deepEqual(storage.profile(story), profile);
  assert.equal(memory.getItem("sd_save_slot_1"), legacy);
  assert.equal(storage.read("save_auto").schemaVersion, 2);
});
test("storage failure is reported instead of claiming a save succeeded", () => {
  const errors = [];
  const store = new Storage(
    {
      setItem() {
        throw Error("full");
      },
      getItem() {
        return "{";
      },
    },
    (e) => errors.push(e),
  );
  assert.equal(store.save("1", new StoryEngine(story)), false);
  assert.equal(store.read("save_1"), null);
  assert.equal(errors.length, 2);
});
