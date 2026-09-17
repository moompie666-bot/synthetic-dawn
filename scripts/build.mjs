import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createStory } from "../story/demo.mjs";
import { validateStory } from "../src/engine.js";
const read = (path) =>
  JSON.parse(readFileSync(new URL("../" + path, import.meta.url), "utf8"));
const legacy = read("story/legacy-export.json");
const manifest = read("game/asset-manifest.json");
const map = (object) =>
  Object.fromEntries(
    Object.entries(object).map(([key, path]) => [key, manifest[path]]),
  );
const assets = {
  backgrounds: map(legacy.resources.bg_map),
  characters: Object.fromEntries(
    Object.entries(legacy.resources.char_map).map(([key, value]) => [
      key,
      map(value),
    ]),
  ),
  cg: map(legacy.resources.cg_map),
  music: { machina: "game/audio/machina.mp3" },
};
const story = createStory(legacy, assets);
const result = validateStory(story);
for (const item of Object.values(manifest))
  for (const key of ["desktop", "mobile"])
    if (!existsSync(item[key])) throw new Error("Missing asset " + item[key]);
for (const audio of Object.values(assets.music))
  if (!existsSync(audio)) throw new Error("Missing audio " + audio);
writeFileSync("game/story.json", JSON.stringify(story) + "\n");
writeFileSync("index.html", readFileSync("src/shell.html", "utf8"));
console.log(
  `Built ${story.version}: ${result.nodes} nodes, ${result.choices} choices. Every target and resource validated.`,
);
