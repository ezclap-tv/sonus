import "./water/index.css";
import "preact";
import { define, handle, visit } from "./command";
import { connect } from "./irc";
import { Player } from "./player";
import { Store } from "./store";

const unique = <T>(a: T[]) => [...new Set(a)];

/** @type {HTMLInputElement} */
// @ts-expect-error
const input: HTMLInputElement = document.getElementById("channel");
/** @type {HTMLButtonElement} */
// @ts-expect-error
const submit: HTMLButtonElement = document.getElementById("submit");

input.onkeyup = ({ code }) => code === "Enter" && submit.click();
submit.onclick = () => {
  window.location.hash = input.value;
  window.location.reload();
};

const CHANNEL = window.location.hash.substring(1);
if (CHANNEL) {
  const player = new Player(JSON.parse(__SOUNDS__));

  const violatee = CHANNEL;
  const prefix = new Store(`prefix.${violatee}`, () => "!xd");
  const chieftains = new Store(`chieftains.${violatee}`, () => unique([violatee]));
  const violators = new Store(`violators.${violatee}`, () => unique([violatee]));
  /**
   * @param {string} user
   * @param {"violator" | "chieftain" | "violatee"} level
   */
  const perms = (user: string, level: "violator" | "chieftain" | "violatee") => {
    switch (level) {
      case "violator":
        return user === violatee || chieftains.get().includes(user) || violators.get().includes(user);
      case "chieftain":
        return user === violatee || chieftains.get().includes(user);
      case "violatee":
        return user === violatee;
    }
  };
  const prefs = new Store(`preferences.${violatee}`, () => ({ autoplay: false }));
  /** @type {Store<Record<string, string>>} */
  const aliases: Store<Record<string, string>> = new Store(`aliases.${violatee}`, () => ({}));
  const commands = define({
    $play: {
      allows: (user) => perms(user, "violator"),
      /**
       * @param {string} user
       * @param {string} sound
       */
      handle(user: string, sound: string) {
        if (player.playing) return;
        sound = sound.toLowerCase();
        sound = sound.split(" ")[0];
        sound = sound in aliases.get() ? aliases.get()[sound] : sound;
        console.log(`${user} played ${sound}`);
        player.play(sound);
      },
      description: () => "Play the sound {0}",
    },
    $stop: {
      allows: (user) => perms(user, "violator"),
      handle(user) {
        if (!player.playing) return;
        player.stop();
        console.log(`${user} stopped ${player.playing}`);
      },
      description: () => "Stop playing the current sound",
    },
    $add: {
      allows: (user) => perms(user, "chieftain"),
      handle(user, username) {
        username = username.trim().toLowerCase();
        violators.update((v) => unique([...v, username]));
        console.log(`${user} added ${username} as violator`);
      },
      description: () => "Add {0} to the violators list",
    },
    $rm: {
      allows: (user) => perms(user, "chieftain"),
      handle(user, username) {
        username = username.trim().toLowerCase();
        violators.update((v) => v.filter((u) => u !== username));
        console.log(`${user} removed ${username} as violator`);
      },
      description: () => "Remove {0} from the violators list",
    },
    $autoplay: {
      _: {
        on: {
          allows: (user) => perms(user, "chieftain"),
          handle(user) {
            prefs.update((v) => {
              v.autoplay = true;
              return v;
            });
            console.log(`${user} enabled autoplay mode`);
          },
          description: () => "Enable autoplay mode",
        },
        off: {
          allows: (user) => perms(user, "chieftain"),
          handle(user) {
            prefs.update((v) => {
              v.autoplay = false;
              return v;
            });
            console.log(`${user} disabled autoplay mode`);
          },
          description: () => "Disable autoplay mode",
        },
      },
    },
    $alias: {
      _: {
        add: {
          allows: (user) => perms(user, "chieftain"),
          handle(user, name, as) {
            name = name.toLowerCase();
            as = as.toLowerCase();
            const exists = name in aliases.get();
            aliases.update((v) => {
              v[name] = as;
              return v;
            });
            console.log(`${user} ${exists ? "updated" : "added"} an alias: ${name} -> ${as}`);
          },
          description: () => "Add {0} as an alias for {1}",
        },
        rm: {
          allows: (user) => perms(user, "chieftain"),
          handle(user, name) {
            name = name.toLowerCase();
            aliases.update((v) => {
              delete v[name];
              return v;
            });
            console.log(`${user} removed an alias: ${name}`);
          },
          description: () => "Remove {0} as an alias",
        },
      },
    },
    $chief: {
      _: {
        add: {
          allows: (user) => perms(user, "violatee"),
          handle(user, target) {
            chieftains.update((v) => unique([...v, target]));
            console.log(`${user} added ${target} to chieftains`);
          },
          description: () => "Add {0} to chieftains (able to use privileged commands)",
        },
        rm: {
          allows: (user) => perms(user, "violatee"),
          handle(user, target) {
            chieftains.update((v) => v.filter((t) => t !== target));
            console.log(`${user} removed ${target} from chieftains`);
          },
          description: () => "Remove {0} from chieftains",
        },
      },
    },
    $prefix: {
      allows: (user) => perms(user, "violatee"),
      handle(user, value) {
        prefix.update(() => value);
        console.log(`${user} updated prefix to ${value}`);
      },
      description: () => "Set command prefix to {0}",
    },
  });

  // command table
  {
    // @ts-expect-error
    const tbody = document.getElementById("commands").getElementsByTagName("tbody")[0];

    const row = tbody.insertRow();
    const commandCell = row.insertCell();
    const commandText = document.createTextNode(`${prefix.get()} {0}`);
    prefix.subscribe((v) => (commandText.data = v));
    commandCell.appendChild(commandText);
    const descriptionCell = row.insertCell();
    descriptionCell.appendChild(document.createTextNode("Play the sound {0}"));

    visit(commands, (chain, node) => {
      if (!("handle" in node)) return;
      const row = tbody.insertRow();
      const cmd = row.insertCell();

      const arity = node.handle.length;
      const args = Array(arity > 1 ? arity - 1 : 0)
        .fill(0)
        .map((_, i) => `{${i}}`)
        .join(" ");
      const cmdText = document.createTextNode(`${chain.join(" ")} ${args}`);
      prefix.subscribe((v) => (cmdText.data = `${v} ${chain.join(" ")} ${args}`));
      cmd.appendChild(cmdText);

      const desc = row.insertCell();
      if (node.description) desc.appendChild(document.createTextNode(node.description()));
    });
  }
  // sound table
  {
    // @ts-expect-error
    const tbody = document.getElementById("sounds").getElementsByTagName("tbody")[0];

    for (const sound of Object.keys(player.sounds)) {
      const row = tbody.insertRow();
      const soundCell = row.insertCell();
      soundCell.appendChild(document.createTextNode(sound));

      const commandCell = row.insertCell();
      const copyButton = document.createElement("button");
      commandCell.appendChild(copyButton);
      copyButton.textContent = `${prefix.get()} ${sound}`;
      let clicked = false;
      copyButton.onclick = async () => {
        if (clicked) return;
        // @ts-expect-error
        await navigator.clipboard.writeText(copyButton.textContent);
        copyButton.textContent = "Copied!";
        clicked = true;
        setTimeout(() => {
          copyButton.textContent = `${prefix.get()} ${sound}`;
          clicked = false;
        }, 1000);
      };
      prefix.subscribe((v) => (copyButton.textContent = `${v} ${sound}`));

      const playCell = row.insertCell();
      const playButton = document.createElement("button");
      const _stop = () => player.stop();
      const _play = () => player.play(sound);
      player.on("play", (name) => {
        if (name !== sound) return;
        playButton.textContent = `⏹ ${sound}`;
        playButton.onclick = _stop;
      });
      player.on("stop", () => {
        playButton.textContent = `▶️ ${sound}`;
        playButton.onclick = _play;
      });
      playButton.textContent = `▶️ ${sound}`;
      playButton.onclick = _play;
      playCell.appendChild(playButton);
    }
  }

  async function onclose() {
    console.log("Disconnected, reconnecting...");
    ws = await connect(CHANNEL);
    ws.onclose = onclose;
    ws.onmessage = onmessage;
  }

  /**
   * @param {MessageEvent<any>} param0
   */
  function onmessage({ data: message }: MessageEvent<any>) {
    if (message.includes("PING")) return ws.send("PONG :tmi.twitch.tv");
    handle(prefs.get(), commands, prefix.get(), message);
  }

  let ws = await connect(CHANNEL);
  ws.onclose = onclose;
  ws.onmessage = onmessage;

  console.log("Connected");
  console.log("channel", CHANNEL);
  console.log("prefix", prefix.get());
  console.log("commands", commands);
  console.log("preferences", prefs.get());
  console.log("violatee", violatee);
  console.log("violators", violators.get());
  console.log("aliases", aliases.get());
  console.log("sounds", player.sounds);
}

export {};
