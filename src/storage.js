import { clone } from "./engine.js";
export const PREFIX = "sd_v2_";
export const DEFAULT_PREFS = {
  cps: 36,
  instant: false,
  fontSize: 20,
  autoDelay: 2.5,
  reducedMotion: false,
  music: 0.35,
  ambience: 0.28,
  sfx: 0.35,
  muted: false,
};
const emptyProfile = () => ({ seen: [], cg: [], endings: [], chapters: [] });
export class Storage {
  constructor(storage, onError = () => {}) {
    this.storage = storage;
    this.onError = onError;
  }
  read(key, fallback = null) {
    try {
      const raw = this.storage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : clone(fallback);
    } catch {
      this.onError("本机数据暂时无法读取；可以继续游玩。");
      return clone(fallback);
    }
  }
  write(key, value) {
    try {
      this.storage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      this.onError("保存失败：浏览器存储不可用或已满。请导出存档备份。");
      return false;
    }
  }
  save(slot, engine) {
    const value = {
      ...engine.snapshot(),
      savedAt: new Date().toISOString(),
      preview:
        engine.current.text || engine.current.title || engine.current.prompt,
    };
    return this.write("save_" + slot, value);
  }
  slots() {
    return ["auto", "checkpoint", "quick", "1", "2", "3", "4", "5", "6"].map(
      (id) => ({ id, data: this.read("save_" + id) }),
    );
  }
  legacy() {
    const entries = {};
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key?.startsWith("sd_") && !key.startsWith(PREFIX))
          entries[key] = this.storage.getItem(key);
      }
    } catch {
      /* Reading old data is optional. */
    }
    return entries;
  }
  profile(story) {
    const raw = this.read("profile", emptyProfile());
    const profile = emptyProfile();
    for (const k of Object.keys(profile))
      if (Array.isArray(raw?.[k]))
        profile[k] = [...new Set(raw[k].filter((x) => typeof x === "string"))];
    // Art unlocks are safe to carry over; damaged v0.1 story positions are not.
    for (const [key, value] of Object.entries(this.legacy()))
      if (key.startsWith("sd_save_slot_")) {
        try {
          for (const id of JSON.parse(value)?.nstate?.cgUnlocked || [])
            if (story.assets.cg[id] && !profile.cg.includes(id))
              profile.cg.push(id);
        } catch {
          /* Preserve malformed legacy data untouched. */
        }
      }
    return profile;
  }
  prefs() {
    const raw = this.read("prefs", {}),
      out = { ...DEFAULT_PREFS };
    for (const key of ["instant", "reducedMotion", "muted"])
      if (typeof raw?.[key] === "boolean") out[key] = raw[key];
    for (const [key, min, max] of [
      ["cps", 10, 80],
      ["fontSize", 18, 28],
      ["autoDelay", 1, 6],
      ["music", 0, 1],
      ["ambience", 0, 1],
      ["sfx", 0, 1],
    ])
      if (Number.isFinite(raw?.[key]))
        out[key] = Math.max(min, Math.min(max, raw[key]));
    return out;
  }
}
