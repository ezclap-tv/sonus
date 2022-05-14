import type { Cooldowns } from "../data";
import type { Store } from "./store";

class CooldownManager {
  perUser: Record<string, number> = {};
  perSound: Record<string, number> = {};
  constructor(public store: Store<Cooldowns>) {}

  canPlay(sound: string, user?: string): boolean {
    const cooldowns = this.store.get();
    if (!(sound in cooldowns)) return true;
    const cooldown = cooldowns[sound];

    const now = Date.now();
    if (
      now <= (this.perSound[sound] ?? 0) + (cooldown.perSound ?? 0) ||
      (user && now <= (this.perUser[user] ?? 0) + (cooldown.perUser ?? 0))
    ) {
      console.log(`${user} could not play ${sound} due to a pending cooldown`);
      return false;
    }

    this.perSound[sound] = now;
    if (user) this.perUser[user] = now;

    return true;
  }
}

export class Player {
  playing: string | null = null;
  cache: Map<string, HTMLAudioElement> = new Map();
  callbacks = {
    play: new Set<(name: string) => void>(),
    stop: new Set<(name: string) => void>(),
  };
  cooldown: CooldownManager;

  constructor(
    public channel: string,
    cooldowns: Store<Cooldowns>,
    public sounds: Record<string, string> = {}
  ) {
    this.cooldown = new CooldownManager(cooldowns);
  }

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

  async play(sound: string, user?: string): Promise<void> {
    if (this.playing) this.stop();
    const file = this.get(sound);
    if (!file) return;
    if (user !== this.channel && !this.cooldown.canPlay(sound, user)) return;
    this.emit("play", sound);
    this.playing = sound;
    return new Promise((resolve) => {
      file.play().then(() => {
        const ondone = () => {
          if (this.playing === sound) {
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
