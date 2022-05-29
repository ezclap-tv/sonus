import { Command, CommandMap, CommandNonRoot, Default } from "./core/command";
import { parseDuration } from "./core/duration";
import { Player } from "./core/player";
import { Store } from "./core/store";
import TTS from "./core/tts";
import { capitalize } from "./core/util";

export const channel = window.location.hash
  ? window.location.hash.substring(1)
  : undefined;

const storeKey = (key: string, base?: string) =>
  base ? `${key}.${base}` : "[[empty]]";

export const prefix = new Store(storeKey("prefix", channel), () => "!xd");

export enum Role {
  None = 0,
  User = 1,
  Editor = 2,
  Streamer = 3,
}
const roles = Object.keys(Role).filter((v) => Number.isNaN(Number(v)));
export type User = {
  name: string;
  role: Role;
};
export type Users = Record<string, User>;
export const users = new Store<Users>(storeKey("users", channel), () =>
  channel
    ? {
        [channel]: {
          name: channel,
          role: Role.Streamer,
        },
      }
    : {},
);

export type Preferences = {
  autoplay: boolean;
};
const defaultPrefs: Preferences = { autoplay: false };
export const prefsDescriptions: Record<keyof Preferences, string> = {
  autoplay: "Allows playing sounds without the command prefix",
};
export const prefs = new Store<Preferences>(
  storeKey("preferences", channel),
  () => ({
    ...defaultPrefs,
  }),
);

export type Aliases = Record<string, string>;
export const aliases = new Store<Aliases>(
  storeKey("aliases", channel),
  () => ({}),
);

// NOTE: cooldowns are in milliseconds
export type Cooldowns = Record<string, { perUser: number; perSound: number }>;
export const cooldowns = new Store<Cooldowns>(
  storeKey("cooldowns", channel),
  () => ({}),
);

export type TtsCooldown = { global: number; user: number };
export const ttsCooldown = new Store<TtsCooldown>(
  storeKey("ttsCooldown", channel),
  () => ({ global: 1000, user: 1000 }),
);

export const Stores = {
  prefix,
  users,
  prefs,
  aliases,
  cooldowns,
  ttsCooldown,
};
export default Stores;

export const player = new Player(channel!, JSON.parse(__SOUNDS__));
const playerCooldownManager = {
  current: {
    perUser: {} as Record<string, number>,
    perSound: {} as Record<string, number>,
  },
  check(sound: string, user: string): boolean {
    if (!(sound in cooldowns.get())) return true;
    const cooldown = cooldowns.get()[sound];

    const now = Date.now();
    if (
      now <= (this.current.perSound[sound] ?? 0) + (cooldown.perSound ?? 0) ||
      now <= (this.current.perUser[user] ?? 0) + (cooldown.perUser ?? 0)
    ) {
      return false;
    }

    this.current.perSound[sound] = now;
    this.current.perUser[user] = now;

    return true;
  },
};

const $play: Command = {
  allows: Role.User,
  handle(user, sound) {
    if (player.playing) return;
    if (
      user.role >= Role.Editor ||
      playerCooldownManager.check(sound, user.name)
    ) {
      // normalize, accept first part of args as sound
      sound = sound.toLowerCase().split(" ")[0];
      // resolve alias
      sound = sound in aliases.get() ? aliases.get()[sound] : sound;
      if (sound in player.sounds) {
        console.log(`${user.name} played ${sound}`);
        player.play(sound, user.name);
      }
    }
  },
  description: "Play the sound {0}.",
  example: (p) => `${p}play ame_hates_minecraft`,
};

const $stop: Command = {
  allows: Role.Editor,
  handle(user) {
    if (!player.playing) return;
    console.log(`${user.name} stopped ${player.playing}`);
    player.stop();
  },
  description: "Stop playing the current sound.",
  example: (p) => `${p}stop`,
};

const $role: Command = {
  allows: Role.Streamer,
  handle(user, name, role) {
    // enums also have numeric keys, which we want to ignore
    if (!Number.isNaN(Number(role))) return;

    role = capitalize(role.toLowerCase());
    if (role in Role) {
      users.update((v) => ({
        ...v,
        [name]: {
          name,
          role: (Role as unknown as Record<string, number>)[role],
        },
      }));
    }
    console.log(`${user.name} set role of ${name} to ${role}`);
  },
  description: `Update role for user {0} to {1}. Roles: ${roles.join(", ")}`,
  example: (p) => `${p}role justinfan91234 editor`,
};

const $prefs: Command = {
  allows: Role.Streamer,
  handle(user, key, value) {
    if (key in prefs.get()) {
      const prefKey = key as keyof Preferences;
      switch (value) {
        case "toggle":
          prefs.update((v) => ({ ...v, [prefKey]: !v[prefKey] }));
          break;
        case "on":
        case "true":
        case "yes":
          prefs.update((v) => ({ ...v, [prefKey]: true }));
          break;
        case "off":
        case "false":
        case "no":
          prefs.update((v) => ({ ...v, [prefKey]: false }));
          break;
      }
      console.log(`Updated preference ${key} to ${prefs.get()[prefKey]}`);
    }
  },
  description: `Update preference {0}. Keys: ${Object.keys(defaultPrefs).join(
    ", ",
  )}, values: on/true/yes, off/false/no`,
  example: (p) => `${p}prefs autoplay on`,
};

const $alias: Command = {
  _: {
    set: {
      allows: Role.Editor,
      handle(user, name, as) {
        name = name.toLowerCase();
        as = as.toLowerCase();
        if (!(as in player.sounds)) return;
        const exists = name in aliases.get();
        aliases.update((v) => ({
          ...v,
          [name]: as,
        }));
        console.log(
          `${user.name} ${
            exists ? "updated" : "added"
          } an alias: ${name} -> ${as}`,
        );
      },
      description:
        "Add {0} as an alias for {1}. Note that you can't create an alias which is named the same as an existing sound.",
      example: (p) => `${p}alias set SSSsss ame_hates_minecraft`,
    },
    rm: {
      allows: Role.Editor,
      handle(user, name) {
        name = name.toLowerCase();
        aliases.update((v) => {
          const aliases = { ...v };
          delete aliases[name];
          return aliases;
        });
        console.log(`${user.name} removed an alias: ${name}`);
      },
      description: "Remove {0} from aliases.",
      example: (p) => `${p}alias rm SSSsss`,
    },
  },
};

const $prefix: Command = {
  allows: Role.Streamer,
  handle(user, value) {
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, value.length - 1);
    }
    prefix.update(() => value);
    console.log(`${user.name} updated prefix to ${value}`);
  },
  description: "Set command prefix to {0}. {0} may be enclosed in quotes.",
  example: (p) => `${p}prefix !`,
};

const ttsCooldownManager = {
  current: { global: 0, user: {} as Record<string, number> },
  check(user: string) {
    const config = ttsCooldown.get();
    const now = Date.now();
    const elapsedGlobal = now - this.current.global;
    const elapsedUser = now - (this.current.user[user] ?? 0);
    if (config.global >= elapsedGlobal || config.user >= elapsedUser) {
      return false;
    }
    this.current.global = now;
    this.current.user[user] = now;
    return true;
  },
};

const $say: Command = {
  allows: Role.User,
  handle(user, text) {
    console.log(user, ttsCooldownManager.current);
    if (user.role >= Role.Editor || ttsCooldownManager.check(user.name)) {
      TTS.say(text);
      console.log(`${user.name} said ${text} through TTS`);
    }
  },
  description: "Say {0} through TTS",
  example: (p) => `${p}say L_? L_? L_? L_? L_? L_? L_? L_? L_?`,
};

const _ttsCooldownPreset = (which: "user" | "global") => {
  const set: Command = {
    allows: Role.Editor,
    handle(user, value) {
      const millis = parseDuration(value);
      ttsCooldown.update((v) => ({ ...v, [which]: millis }));
      console.log(`${user.name} set ${which} TTS cooldown to ${value}`);
    },
    description: `Set ${which} TTS cooldown to {0}.`,
    example: (p) => `${p}cooldown set tts ${which} 50s`,
  };
  return { set };
};

const _userTtsCooldownPreset = _ttsCooldownPreset("user");
const _globalTtsCooldownPreset = _ttsCooldownPreset("global");

// this exists to avoid 2 sets of identical commands, one for `perUser` and the other for `perSound`
const _cooldownPreset = (which: "user" | "sound") => {
  const field = which === "user" ? "perUser" : "perSound";
  const primary = field;
  const secondary = which === "user" ? "perSound" : "perUser";

  const set: Command = {
    allows: Role.Editor,
    handle(user, name, value) {
      const millis = parseDuration(value);
      if (!(name in player.sounds)) {
        // resolve alias if sound is not found
        if (name in aliases.get()) name = aliases.get()[name];
        else return;
      }

      cooldowns.update((v) => ({
        ...v,
        [name]: {
          // set either `perUser` or `perSound` to `seconds`,
          // while preserving the value of the other field,
          // or defaulting the other field to 0
          [primary]: millis,
          [secondary]: v[name]?.perSound ?? 0,
        } as any,
      }));
      console.log(`${user.name} set cooldown of ${name} to ${value}`);
    },
    description: `Set ${which} cooldown for {0} to {1}. {1} is either a number in seconds, or a free-form value such as "1min 30s".`,
    example: (p) => `${p}cooldown set ${which} ame_hates_minecraft 1m 30s`,
  };
  const rm: Command = {
    allows: Role.Editor,
    handle(user, name) {
      // resolve alias
      if (name in aliases.get()) name = aliases.get()[name];
      if (!(name in player.sounds)) return;
      if (!(name in cooldowns.get())) return;

      cooldowns.update((v) => {
        const cooldowns = { ...v };
        cooldowns[name][field] = 0;
        // if both cooldowns are 0, we can delete the key
        if (cooldowns[name].perSound === 0 && cooldowns[name].perUser === 0) {
          delete cooldowns[name];
        }
        return cooldowns;
      });
      console.log(`${user.name} removed cooldown of ${name}`);
    },
    description: `Remove ${which} cooldown for {0}.`,
    example: (p) => `${p}cooldown rm ${which} ame_hates_minecraft`,
  };

  return {
    set,
    rm,
  };
};

const _userCooldownPreset = _cooldownPreset("user");
const _soundCooldownPreset = _cooldownPreset("sound");

const $cooldown: Command = {
  _: {
    set: {
      _: {
        user: _userCooldownPreset.set,
        sound: _soundCooldownPreset.set,
        tts: {
          _: {
            user: _userTtsCooldownPreset.set,
            global: _globalTtsCooldownPreset.set,
          },
        },
      },
    },
    rm: {
      _: {
        user: _userCooldownPreset.rm,
        sound: _soundCooldownPreset.rm,
      },
    },
  },
};

export const commands: CommandMap = {
  [Default]: $play,
  play: $play,
  stop: $stop,
  role: $role,
  prefs: $prefs,
  alias: $alias,
  prefix: $prefix,
  say: $say,
  cooldown: $cooldown,
};
