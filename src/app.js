import { StoryEngine, validateStory, matches } from "./engine.js";
import { Storage } from "./storage.js";
import { Soundscape } from "./audio.js";

const $ = (id) => document.getElementById(id);
const el = (tag, text, className) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (className) n.className = className;
  return n;
};
let toastTimer,
  timer,
  frame,
  generation = 0,
  engine,
  story,
  profile,
  mode = null,
  typing = false,
  completeLine = () => {},
  screen = "title";
let previousClues = [];
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4500);
}
let backing;
try {
  backing = window.localStorage;
} catch {
  backing = {
    getItem: () => null,
    setItem: () => {
      throw Error("Unavailable");
    },
    length: 0,
  };
}
const storage = new Storage(backing, toast),
  prefs = storage.prefs(),
  sound = new Soundscape(prefs, toast);
function preferences() {
  document.documentElement.style.setProperty(
    "--dialogue-size",
    prefs.fontSize + "px",
  );
  document.body.classList.toggle("reduced-motion", prefs.reducedMotion);
  sound.setPrefs(prefs);
  $("sound-button").textContent = prefs.muted ? "声音关" : "声音开";
  $("sound-button").setAttribute("aria-pressed", String(!prefs.muted));
}
preferences();
function stop() {
  mode = null;
  clearTimeout(timer);
  $("auto-button").setAttribute("aria-pressed", "false");
  $("skip-button").setAttribute("aria-pressed", "false");
}
function cancelRender() {
  generation++;
  cancelAnimationFrame(frame);
  clearTimeout(timer);
  typing = false;
}
function showScreen(name) {
  screen = name;
  for (const key of ["title", "game", "end"])
    $(key + "-screen").hidden = key !== name;
}
const assetURL = (asset) =>
  asset?.[matchMedia("(max-width:700px)").matches ? "mobile" : "desktop"];
const seenKey = () => story.version + ":" + engine.current.id;
function persistProfile() {
  storage.write("profile", profile);
}
function schedule() {
  clearTimeout(timer);
  if (
    !mode ||
    typing ||
    $("panel").open ||
    document.hidden ||
    screen !== "game"
  )
    return;
  if (engine.current.type !== "say") {
    stop();
    return;
  }
  if (mode === "skip" && !profile.seen.includes(seenKey())) {
    stop();
    return;
  }
  timer = setTimeout(
    () => advance(),
    mode === "skip" ? 90 : prefs.autoDelay * 1000,
  );
}
function reveal() {
  const n = engine.current,
    token = generation;
  const chars =
    typeof Intl.Segmenter === "function"
      ? [
          ...new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(
            n.text,
          ),
        ].map((x) => x.segment)
      : Array.from(n.text);
  typing = true;
  const started = performance.now();
  completeLine = () => {
    if (token !== generation) return;
    cancelAnimationFrame(frame);
    typing = false;
    $("dialogue-text").textContent = n.text;
    $("dialogue-announcement").textContent =
      (story.characters[n.speaker].name || "旁白") + "：" + n.text;
    if (!profile.seen.includes(seenKey())) {
      profile.seen.push(seenKey());
      persistProfile();
    }
    schedule();
  };
  if (prefs.instant || mode === "skip") {
    completeLine();
    return;
  }
  const tick = (now) => {
    if (token !== generation) return;
    const count = Math.floor(((now - started) * prefs.cps) / 1000);
    $("dialogue-text").textContent = chars.slice(0, count).join("");
    if (count >= chars.length) completeLine();
    else frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}
const warmed = new Set();
function warm(asset) {
  const url = assetURL(asset);
  if (!url || warmed.has(url)) return;
  warmed.add(url);
  const img = new Image();
  img.src = url;
}
function paintArt() {
  const state = engine.state;
  $("scene-background").style.backgroundImage =
    `url("${assetURL(story.assets.backgrounds[state.art.bg])}")`;
  $("actors").replaceChildren();
  for (const actor of state.art.sprites) {
    const image = el("img");
    image.src = assetURL(
      story.assets.characters[actor.character][actor.costume],
    );
    image.alt = story.characters[actor.character]?.name || "";
    image.className =
      "actor " +
      actor.slot +
      (engine.current.speaker === actor.character ? " active" : "");
    image.dataset.slot = actor.slot;
    image.dataset.active = String(engine.current.speaker === actor.character);
    image.dataset.expression = actor.expression;
    image.dataset.pose = actor.pose;
    image.addEventListener(
      "error",
      () => toast("人物图片加载失败，请检查网络后重试。"),
      { once: true },
    );
    $("actors").append(image);
  }
  $("cg-image").hidden = !state.art.cg;
  if (state.art.cg)
    $("cg-image").style.backgroundImage =
      `url("${assetURL(story.assets.cg[state.art.cg])}")`;
  // Only warm the first next scene, never an entire branch or gallery.
  let n = engine.current;
  for (let i = 0; i < 20 && n?.next; i++) {
    n = story.nodes[n.next];
    if (n.type === "scene") {
      warm(story.assets.backgrounds[n.art.bg]);
      for (const a of n.art.sprites)
        warm(story.assets.characters[a.character][a.costume]);
      break;
    }
  }
  sound.sync(state.audio, story.assets);
}
function render(save = true) {
  cancelRender();
  const n = engine.current;
  const newClues = engine.state.clues.filter(
    (id) => !previousClues.includes(id),
  );
  previousClues = [...engine.state.clues];
  if (newClues.length && screen === "game") {
    sound.cue("clue");
    toast(
      "记下线索：" + newClues.map((id) => story.clues[id].title).join("、"),
    );
  }
  for (const key of ["cg", "chapters"]) {
    const values =
      key === "cg" ? engine.state.cg : engine.state.visitedChapters;
    profile[key] = [...new Set([...profile[key], ...values])];
  }
  if (n.type === "end" && !profile.endings.includes(n.id))
    profile.endings.push(n.id);
  persistProfile();
  if (save) storage.save("auto", engine);
  paintArt();
  if (n.type === "end") {
    stop();
    showScreen("end");
    $("end-caption").textContent =
      n.kind === "bad" ? "本次调查结束" : "第二章 · 路线体验完成";
    $("end-title").textContent = n.title;
    $("end-summary").textContent = n.summary;
    $("end-hook").textContent = n.hook;
    $("end-recap").replaceChildren(
      ...n.recap
        .filter((r) => matches(r.when, engine.state))
        .map((r) => el("li", r.text)),
    );
    const cg = engine.state.cg.at(-1);
    $("end-art").style.backgroundImage =
      `url("${assetURL(story.assets.cg[cg] || story.assets.backgrounds[engine.state.art.bg])}")`;
    $("end-return").textContent =
      n.kind === "bad" ? "回到上一次选择" : "回到路线分歧";
    return;
  }
  showScreen("game");
  $("chapter-title").textContent = story.chapters[engine.state.chapter].title;
  $("clue-count").textContent = engine.state.clues.length;
  $("back-button").disabled = !engine.backstack.length;
  $("dialogue-announcement").textContent = "";
  $("choices").hidden = n.type !== "choice";
  $("dialogue-text").hidden = n.type !== "say";
  $("next-button").hidden = n.type !== "say";
  $("speaker").textContent =
    n.type === "say" ? story.characters[n.speaker].name : "";
  $("speaker").style.color =
    n.type === "say" ? story.characters[n.speaker].color : "";
  if (n.type === "choice") {
    stop();
    $("reading-hint").textContent = "选择之后仍可回退";
    $("choice-prompt").textContent = n.prompt;
    $("choice-list").replaceChildren();
    for (const option of engine.options()) {
      const button = el("button", option.text, "choice-button");
      if (option.hint) button.append(el("small", option.hint));
      button.addEventListener("click", () => {
        if (engine.current.id === "crossroads.choose")
          storage.save("checkpoint", engine);
        sound.cue();
        engine.choose(option.id);
        render();
      });
      $("choice-list").append(button);
    }
    requestAnimationFrame(() =>
      $("choice-list").querySelector("button")?.focus({ preventScroll: true }),
    );
  } else {
    $("reading-hint").textContent = "点击文字展开；再次点击继续";
    $("dialogue-text").textContent = "";
    if (mode === "skip" && !profile.seen.includes(seenKey())) stop();
    reveal();
  }
}
function advance() {
  if (!engine || screen !== "game" || $("panel").open) return;
  if (typing) {
    completeLine();
    return;
  }
  if (engine.next()) render();
}
function openPanel(title) {
  stop();
  if (typing) completeLine();
  $("panel-title").textContent = title;
  $("panel-body").className = "panel-body";
  $("panel-body").replaceChildren();
  $("panel").scrollTop = 0;
  if (!$("panel").open) $("panel").showModal();
  return $("panel-body");
}
function button(parent, text, fn) {
  const b = el("button", text);
  b.addEventListener("click", fn);
  parent.append(b);
  return b;
}
function closePanel() {
  $("panel").close();
}
function confirmAction(title, message) {
  stop();
  $("confirm-title").textContent = title;
  $("confirm-message").textContent = message;
  $("confirm").returnValue = "cancel";
  $("confirm").showModal();
  return new Promise((resolve) =>
    $("confirm").addEventListener(
      "close",
      () => resolve($("confirm").returnValue === "accept"),
      { once: true },
    ),
  );
}
async function load(snapshot) {
  try {
    const next = new StoryEngine(story);
    next.restore(snapshot);
    stop();
    engine = next;
    closePanel();
    await sound.unlock();
    sound.resume();
    render();
  } catch (error) {
    toast(error.message);
  }
}
function download(value, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = el("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function saves() {
  const body = openPanel("存档与读取");
  body.append(
    el("p", "自动保存当前进度。手动存档可保留分支前的选择。", "subtle"),
  );
  const list = el("div", undefined, "slots");
  body.append(list);
  for (const { id, data } of storage.slots()) {
    const card = el("article", undefined, "slot");
    card.append(
      el(
        "h3",
        { auto: "自动存档", checkpoint: "路线分歧", quick: "快速存档" }[id] ||
          "存档 " + id,
      ),
    );
    card.append(el("p", data?.preview || "空存档"));
    if (data)
      card.append(el("small", new Date(data.savedAt).toLocaleString("zh-CN")));
    const actions = el("div", undefined, "slot-actions");
    card.append(actions);
    if (data)
      button(actions, "读取", async () => {
        if (
          await confirmAction(
            "读取这份存档？",
            "读取后将覆盖自动存档。如需保留当前进度，请先手动保存。",
          )
        )
          load(data);
      });
    if (!["auto", "checkpoint"].includes(id) && engine)
      button(actions, "保存", async () => {
        if (
          !data ||
          (await confirmAction("覆盖此存档？", "覆盖后可从新的位置继续。"))
        ) {
          if (storage.save(id, engine)) {
            toast("已保存");
            saves();
          }
        }
      });
    list.append(card);
  }
  const tools = el("div", undefined, "backup-tools");
  body.append(tools);
  if (engine)
    button(tools, "导出当前存档", () =>
      download(engine.snapshot(), "synthetic-dawn-save.json"),
    );
  button(tools, "导入存档", () => $("import-file").click());
  const legacy = storage.legacy();
  if (Object.keys(legacy).length) {
    body.append(
      el(
        "p",
        "检测到旧版数据。旧剧本的索引无法可靠迁移，原数据仍保留；已获得的有效回忆图片会继承。",
        "legacy-note",
      ),
    );
    button(body, "备份旧版数据", () =>
      download(legacy, "synthetic-dawn-legacy.json"),
    );
  }
}
function settings() {
  const body = openPanel("阅读与声音");
  const ranges = [
    ["fontSize", "文字大小", 18, 28, 1],
    ["cps", "每秒文字数", 10, 80, 1],
    ["autoDelay", "自动等待（秒）", 1, 6, 0.5],
    ["music", "音乐音量", 0, 1, 0.05],
    ["ambience", "环境音量", 0, 1, 0.01],
    ["sfx", "提示音量", 0, 1, 0.05],
  ];
  for (const [key, title, min, max, step] of ranges) {
    const row = el("label", undefined, "settings-row");
    const label = el("span", title);
    const input = el("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = prefs[key];
    input.setAttribute("aria-label", title);
    const output = el("output", String(prefs[key]));
    input.addEventListener("input", () => {
      prefs[key] = Number(input.value);
      output.textContent = input.value;
      preferences();
      storage.write("prefs", prefs);
    });
    row.append(label, input, output);
    body.append(row);
  }
  for (const [key, title] of [
    ["instant", "文字立即显示"],
    ["reducedMotion", "减少动态效果"],
    ["muted", "静音"],
  ]) {
    const row = el("label", undefined, "settings-row"),
      input = el("input");
    input.type = "checkbox";
    input.checked = prefs[key];
    input.addEventListener("change", () => {
      prefs[key] = input.checked;
      preferences();
      storage.write("prefs", prefs);
    });
    row.append(el("span", title), input);
    body.append(row);
  }
  button(body, "试听提示音", async () => {
    await sound.unlock();
    sound.cue("clue");
  });
}
function history() {
  const body = openPanel("对话回看");
  for (const entry of [
    ...engine.log,
    ...(engine.current.type === "say" ? [engine.current] : []),
  ]) {
    const row = el("article", undefined, "history-row");
    row.append(
      el(
        "strong",
        entry.type === "choice"
          ? "你的选择"
          : story.characters[entry.speaker]?.name || "旁白",
      ),
      el("p", entry.text),
    );
    body.append(row);
  }
  if (!body.children.length) body.append(el("p", "还没有已读对话。"));
  requestAnimationFrame(() => ($("panel").scrollTop = $("panel").scrollHeight));
}
function gallery() {
  const body = openPanel("回忆画廊");
  const unlocked = profile.cg.filter((id) => story.assets.cg[id]);
  body.append(
    el("p", `已留下 ${unlocked.length} 幅回忆。这里只展示你已经见过的内容。`),
  );
  const endings = profile.endings
    .map((id) => story.nodes[id])
    .filter((n) => n?.type === "end");
  if (endings.length) {
    body.append(
      el(
        "p",
        `已完成 ${endings.filter((n) => n.kind === "demo").length} 段路线体验。`,
      ),
    );
    const list = el("ul");
    for (const ending of endings) list.append(el("li", ending.title));
    body.append(list);
  }
  const grid = el("div", undefined, "gallery");
  body.append(grid);
  for (const [i, id] of unlocked.entries()) {
    const b = button(grid, "", () => {
      const panel = openPanel("回忆 " + (i + 1));
      const image = el("img", undefined, "gallery-view");
      image.src = assetURL(story.assets.cg[id]);
      image.alt = "已解锁的剧情回忆 " + (i + 1);
      panel.append(image);
      button(panel, "返回画廊", gallery);
    });
    const img = el("img");
    img.src = story.assets.cg[id].mobile;
    img.alt = "回忆 " + (i + 1);
    img.loading = "lazy";
    b.append(img, el("span", "回忆 " + (i + 1)));
  }
  if (!unlocked.length) body.append(el("p", "走进故事，回忆会在这里留下。"));
}
function about() {
  const body = openPanel("关于《仿生黎明》");
  body.classList.add("about-copy");
  body.append(
    el(
      "p",
      "第一章共同线与凯、莉拉、独行三条路线体验。每条路线完成一次调查，并留下一个新的问题。",
    ),
    el(
      "p",
      "试玩版 0.2：原 Ren’Py 源文件已不再保留。本版在现存人物、素材与可核对的对白基础上重新编写章节；新增内容不是对遗失原文的恢复。",
    ),
    el(
      "p",
      "音乐：'Machina' by Scott Buckley – released under CC-BY 4.0. www.scottbuckley.com.au",
    ),
    el(
      "p",
      "音乐节选前 160 秒，加入淡入淡出并压缩；环境声与提示音由 Web Audio 合成。",
    ),
  );
  for (const [name, url] of [
    ["音乐原作", "https://www.scottbuckley.com.au/library/machina/"],
    ["CC BY 4.0 授权", "https://creativecommons.org/licenses/by/4.0/"],
    ["源代码与反馈", "https://github.com/moompie666-bot/synthetic-dawn"],
  ]) {
    const a = el("a", name);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    body.append(a, el("br"));
  }
  body.append(
    el(
      "p",
      "键盘：Tab 移动焦点，Enter 确认；空格继续对白，左方向键回退，A 自动，S 已读快进，Esc 打开菜单。",
    ),
  );
}
function menu() {
  const body = openPanel("游戏菜单");
  body.classList.add("menu-list");
  for (const [name, action] of [
    ["继续阅读", closePanel],
    ["存档与读取", saves],
    ["对话回看", history],
    ["线索手记", clues],
    ["阅读与声音", settings],
    ["回忆画廊", gallery],
    ["已走过的章节", chapters],
    ["关于作品", about],
    [
      "返回主菜单",
      () => {
        closePanel();
        title();
      },
    ],
  ])
    button(body, name, action);
  if (new URLSearchParams(location.search).has("debug"))
    button(body, "开发状态", () =>
      openPanel("开发状态").append(
        el("pre", JSON.stringify(engine.state, null, 2), "debug-state"),
      ),
    );
}
function clues() {
  const body = openPanel("线索手记");
  for (const id of engine.state.clues) {
    const clue = story.clues[id];
    const row = el("article", undefined, "clue-item");
    row.append(el("h3", clue.title), el("p", clue.text));
    body.append(row);
  }
  if (!engine.state.clues.length) body.append(el("p", "你还没有记下线索。"));
}
function chapters() {
  const body = openPanel("已走过的章节");
  for (const id of engine.state.visitedChapters) {
    const chapter = story.chapters[id];
    const row = el("article", undefined, "chapter-item");
    row.append(el("h3", chapter.title), el("p", chapter.description));
    body.append(row);
  }
}
function title() {
  stop();
  cancelRender();
  sound.pause();
  showScreen("title");
  $("continue-button").hidden = !storage.read("save_auto");
  $("continue-hint").textContent = storage.read("save_auto")?.preview || "";
}
async function action(name) {
  if (!story && name !== "settings") return;
  switch (name) {
    case "start":
      if (
        storage.read("save_auto") &&
        !(await confirmAction(
          "重新开始故事？",
          "手动存档和已解锁回忆会保留。当前自动存档将更新。",
        ))
      )
        return;
      engine = new StoryEngine(story);
      await sound.unlock();
      sound.resume();
      stop();
      render();
      break;
    case "continue":
      load(storage.read("save_auto"));
      break;
    case "next":
      advance();
      break;
    case "back":
      stop();
      if (engine?.back()) render();
      break;
    case "auto":
    case "skip":
      if (mode === name) {
        stop();
        break;
      }
      stop();
      if (engine.current.type !== "say") break;
      if (name === "skip" && !profile.seen.includes(seenKey())) {
        toast("快进只通过已经读完的对白。");
        break;
      }
      mode = name;
      $(name + "-button").setAttribute("aria-pressed", "true");
      schedule();
      break;
    case "sound":
      await sound.unlock();
      prefs.muted = !prefs.muted;
      preferences();
      storage.write("prefs", prefs);
      sound.resume();
      if (engine) sound.sync(engine.state.audio, story.assets);
      break;
    case "settings":
      settings();
      break;
    case "save":
    case "load":
      saves();
      break;
    case "gallery":
      gallery();
      break;
    case "history":
      history();
      break;
    case "clues":
      clues();
      break;
    case "about":
      about();
      break;
    case "menu":
      menu();
      break;
    case "title":
      title();
      break;
    case "checkpoint":
      if (engine.current.kind === "bad") {
        do {
          if (!engine.back()) break;
        } while (engine.current.type !== "choice");
        render();
      } else {
        const index = engine.backstack.findIndex(
          (p) => p.state.nodeId === "crossroads.choose",
        );
        if (index >= 0) {
          const point = engine.backstack[index];
          const snapshot = engine.snapshot();
          snapshot.state = point.state;
          snapshot.nodeId = point.state.nodeId;
          snapshot.log = snapshot.log.slice(0, point.logLength);
          snapshot.backstack = snapshot.backstack.slice(0, index);
          load(snapshot);
        } else toast("这份存档没有路线分歧记录，请从新游戏探索另一条路线。");
      }
      break;
  }
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (target)
    action(target.dataset.action).catch((error) => {
      stop();
      console.error(error);
      toast("操作未完成，当前进度仍可导出备份。");
    });
});
$("dialogue-text").addEventListener("click", advance);
$("close-panel").addEventListener("click", closePanel);
$("import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > 5e6) throw Error("存档文件过大。");
    const data = JSON.parse(await file.text());
    const test = new StoryEngine(story);
    test.restore(data);
    if (
      await confirmAction(
        "导入这份存档？",
        "将替换自动进度并从导入的位置继续，现有手动存档不受影响。",
      )
    )
      await load(data);
  } catch (error) {
    toast(error.message);
  }
});
document.addEventListener("keydown", (event) => {
  if (
    $("panel").open ||
    $("confirm").open ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return;
  if (event.target.closest("input,select,textarea")) return;
  if (["Enter", " "].includes(event.key) && event.target.closest("button,a"))
    return;
  if (screen !== "game") return;
  const key = event.key.toLowerCase();
  const map = {
    " ": "next",
    enter: "next",
    arrowleft: "back",
    a: "auto",
    s: "skip",
    escape: "menu",
  };
  if (map[key]) {
    event.preventDefault();
    action(map[key]);
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stop();
    sound.pause();
  } else if (screen !== "title") sound.resume();
});
matchMedia("(max-width:700px)").addEventListener("change", () => {
  if (engine) paintArt();
});
try {
  const response = await fetch("game/story.json?v=0.2.0");
  if (!response.ok) throw Error("剧本未能下载");
  story = await response.json();
  validateStory(story);
  profile = storage.profile(story);
  $("start-button").disabled = false;
  $("start-button").textContent = "开始故事";
  title();
} catch (error) {
  console.error(error);
  $("boot-error").hidden = false;
  $("boot-error").textContent = "剧本暂时未能加载。请检查网络后刷新页面。";
}
