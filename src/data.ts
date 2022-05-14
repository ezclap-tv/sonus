import { Command, CommandMap, CommandNonRoot, Default } from "./core/command";
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
    : {}
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
  })
);

export type Aliases = Record<string, string>;
export const aliases = new Store<Aliases>(
  storeKey("aliases", channel),
  () => ({})
);

// NOTE: cooldowns are in seconds
export type Cooldowns = Record<string, { perUser: number; perSound: number }>;
export const cooldowns = new Store<Cooldowns>(
  storeKey("cooldowns", channel),
  () => ({})
);

export const Stores = {
  prefix,
  users,
  prefs,
  aliases,
  cooldowns,
};
export default Stores;

export const player = new Player(channel!, cooldowns, JSON.parse(__SOUNDS__));

const $play: Command = {
  allows: Role.User,
  handle(user, sound) {
    if (player.playing) return;
    // normalize, accept first part of args as sound
    sound = sound.toLowerCase().split(" ")[0];
    // resolve alias
    sound = sound in aliases.get() ? aliases.get()[sound] : sound;
    if (sound in player.sounds) {
      console.log(`${user.name} played ${sound}`);
      player.play(sound, user.name);
    }
  },
  description: "Play the sound {0}",
};

const $stop: Command = {
  allows: Role.Editor,
  handle(user) {
    if (!player.playing) return;
    console.log(`${user.name} stopped ${player.playing}`);
    player.stop();
  },
  description: "Stop playing the current sound",
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
};

const $prefs: Command = {
  allows: Role.Streamer,
  handle(user, args) {
    let [key, value = "toggle"] = args.split(" ").map((v) => v.toLowerCase());
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
    ", "
  )}, values: toggle, on/true/yes, off/false/no`,
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
          } an alias: ${name} -> ${as}`
        );
      },
      description: "Add {0} as an alias for {1}",
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
      description: "Remove {0} as an alias",
    },
  },
};

const $prefix: Command = {
  allows: Role.Streamer,
  handle(user, value) {
    prefix.update(() => value);
    console.log(`${user.name} updated prefix to ${value}`);
  },
  description: "Set command prefix to {0}",
};

const $say: Command = {
  allows: Role.User,
  handle(user, text) {
    TTS.say(text);
    console.log(`${user.name} said ${text} through TTS`);
  },
  description: "Say {0} through TTS",
};

// this exists to avoid 2 sets of identical commands, one for `perUser` and the other for `perSound`
const _cooldownPreset = (which: "user" | "sound") => {
  const field = which === "user" ? "perUser" : "perSound";
  const primary = field;
  const secondary = which === "user" ? "perSound" : "perUser";

  const set: Command = {
    allows: Role.Editor,
    handle(user, name, value) {
      const seconds = Number(value);
      if (Number.isNaN(seconds)) return;
      // resolve alias
      if (name in aliases.get()) name = aliases.get()[name];
      if (!(name in player.sounds)) return;

      cooldowns.update((v) => ({
        ...v,
        [name]: {
          // set either `perUser` or `perSound` to `seconds`,
          // while preserving the value of the other field,
          // or defaulting the other field to 0
          [primary]: seconds,
          [secondary]: v[name]?.perSound ?? 0,
        } as any,
      }));
      console.log(`${user.name} set cooldown of ${name} to ${seconds} seconds`);
    },
    description: `Set ${which} cooldown for {0} to {1}`,
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
    description: `Remove ${which} cooldown for {0}`,
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
  $play,
  $stop,
  $role,
  $prefs,
  $alias,
  $prefix,
  $say,
  $cooldown,
};
