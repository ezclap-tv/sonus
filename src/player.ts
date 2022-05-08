export class Player {
  playing: string | null = null;
  cache: Map<string, HTMLAudioElement> = new Map();
  callbacks = {
    play: new Set<(name: string) => void>(),
    stop: new Set<(name: string) => void>(),
  };

  constructor(public sounds: Record<string, string> = {}) {}

  /**
   * @param {"play" | "stop"} event
   * @param {(name: string) => void} callback
   */
  on(event: "play" | "stop", callback: (name: string) => void) {
    if (!(event in this.callbacks)) return;
    this.callbacks[event].add(callback);
  }

  /**
   * @param {"play" | "stop"} event
   * @param {(name: string) => void} callback
   */
  off(event: "play" | "stop", callback: (name: string) => void) {
    if (!(event in this.callbacks)) return;
    this.callbacks[event].delete(callback);
  }

  get(name: string): HTMLAudioElement | null {
    if (!(name in this.sounds)) return null;
    const sound = "sounds/" + this.sounds[name];
    if (!this.cache.has(sound)) this.cache.set(sound, new Audio(sound));
    return this.cache.get(sound) || null;
  }

  /**
   * @param {string} name
   * @returns {Promise<void>}
   */
  async play(name: string): Promise<void> {
    if (this.playing) this.stop();
    const file = this.get(name);
    if (!file) return;

    for (const f of this.callbacks.play) f(name);
    this.playing = name;
    return new Promise((done) => {
      file.play().then(() => {
        const ondone = () => {
          if (this.playing === name) {
            for (const c of this.callbacks.stop) c(this.playing);
            this.playing = null;
          }
          file.removeEventListener("ended", ondone);
          file.removeEventListener("pause", ondone);
          done();
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
    for (const f of this.callbacks.stop) f(this.playing);
    this.playing = null;
  }
}
