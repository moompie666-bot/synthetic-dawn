// Music is loaded only after a user gesture. Ambience/SFX are original Web Audio synthesis.
export class Soundscape {
  constructor(prefs, onError = () => {}) {
    this.prefs = prefs;
    this.onError = onError;
    this.unlocked = false;
    this.ctx = null;
    this.music = null;
    this.musicId = null;
    this.ambienceId = null;
    this.layers = [];
    this.paused = false;
  }
  async unlock() {
    try {
      if (!this.ctx)
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      this.unlocked = true;
    } catch {
      this.onError("当前浏览器未能启用声音；剧情仍可正常游玩。");
    }
  }
  setPrefs(prefs) {
    this.prefs = prefs;
    this.volumes();
  }
  volumes() {
    const p = this.prefs,
      mute = p.muted || this.paused;
    if (this.music) this.music.volume = mute ? 0 : p.music;
    for (const layer of this.layers)
      if (this.ctx)
        layer.gain.gain.setTargetAtTime(
          mute ? 0 : layer.level * p.ambience,
          this.ctx.currentTime,
          0.2,
        );
  }
  sync(audio, assets) {
    if (!this.unlocked) return;
    if (audio.music !== this.musicId) {
      this.music?.pause();
      this.music = null;
      this.musicId = audio.music;
      if (audio.music && assets.music[audio.music]) {
        this.music = new Audio(assets.music[audio.music]);
        this.music.loop = true;
        this.music.preload = "none";
        this.music.addEventListener(
          "error",
          () => this.onError("音乐暂时未能加载，其他功能仍可使用。"),
          { once: true },
        );
        this.volumes();
        if (!this.paused)
          this.music
            .play()
            .catch(() => this.onError("音乐已暂停，请点击声音按钮重试。"));
      }
    }
    if (audio.ambience !== this.ambienceId) {
      for (const layer of this.layers) {
        try {
          layer.source.stop();
          layer.source.disconnect();
          layer.gain.disconnect();
        } catch {}
      }
      this.layers = [];
      this.ambienceId = audio.ambience;
      if (audio.ambience && this.ctx) this.makeAmbience(audio.ambience);
    }
    this.volumes();
  }
  makeAmbience(kind) {
    const ctx = this.ctx;
    if (kind === "rain" || kind === "city") {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate),
        data = buffer.getChannelData(0);
      let previous = 0;
      for (let i = 0; i < data.length; i++) {
        previous = (previous + (Math.random() * 2 - 1) * 0.03) / 1.03;
        data[i] = previous * 4;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = kind === "rain" ? 1800 : 600;
      const gain = ctx.createGain();
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      this.layers.push({ source, gain, level: 0.45 });
      source.start();
    } else {
      const source = ctx.createOscillator();
      source.type = "sine";
      source.frequency.value = kind === "lab" ? 62 : 90;
      const gain = ctx.createGain();
      source.connect(gain);
      gain.connect(ctx.destination);
      this.layers.push({ source, gain, level: 0.055 });
      source.start();
    }
  }
  cue(kind = "click") {
    if (!this.unlocked || !this.ctx || this.prefs.muted || this.paused) return;
    const ctx = this.ctx,
      source = ctx.createOscillator(),
      gain = ctx.createGain();
    source.type = "sine";
    source.frequency.setValueAtTime(
      kind === "clue" ? 660 : 340,
      ctx.currentTime,
    );
    source.frequency.exponentialRampToValueAtTime(
      kind === "clue" ? 880 : 250,
      ctx.currentTime + 0.12,
    );
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, this.prefs.sfx * 0.12),
      ctx.currentTime + 0.012,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.19);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + 0.2);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }
  pause() {
    this.paused = true;
    this.music?.pause();
    this.volumes();
  }
  resume() {
    this.paused = false;
    this.volumes();
    if (this.music && this.unlocked) this.music.play().catch(() => {});
  }
}
