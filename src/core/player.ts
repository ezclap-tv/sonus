export class Player {
  playing: string | null = null;
  cache: Map<string, HTMLAudioElement> = new Map();
  callbacks = {
    play: new Set<(name: string) => void>(),
    stop: new Set<(name: string) => void>(),
  };

  constructor(public sounds: Record<string, string> = {}) {}

  on(event: "play" | "stop", callback: (name: string) => void) {
    this.callbacks[event].add(callback);
  }

  off(event: "play" | "stop", callback: (name: string) => void) {
    this.callbacks[event].delete(callback);
  }

  emit(event: "play" | "stop", name: string) {
    for (const f of this.callbacks[event]) f(name);
  }

  get(name: string): HTMLAudioElement | null {
    if (!(name in this.sounds)) return null;
    const sound = "sounds/" + this.sounds[name];
    if (!this.cache.has(sound)) this.cache.set(sound, new Audio(sound));
    return this.cache.get(sound) || null;
  }

  async play(name: string): Promise<void> {
    if (this.playing) this.stop();
    const file = this.get(name);
    if (!file) return;

    this.emit("play", name);
    this.playing = name;
    return new Promise((resolve) => {
      file.play().then(() => {
        const ondone = () => {
          if (this.playing === name) {
            this.emit("stop", this.playing);
            this.playing = null;
          }
          resolve();
        };
        file.addEventListener("ended", ondone, { once: true });
        file.addEventListener("pause", ondone, { once: true });
      });
    });
  }

  stop() {
    if (!this.playing) return;
    const file = this.get(this.playing);
    if (!file) return;
    file.pause();
    file.currentTime = 0;
    this.emit("stop", this.playing);
    this.playing = null;
  }
}
