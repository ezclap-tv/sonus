(async function () {
  /**
   * @param {WebSocket} ws
   * @param {string} msg
   * @returns {Promise<MessageEvent<any>>}
   */
  async function async_send(ws, msg) {
    return new Promise((resolve, reject) => {
      /** @type {(msg: MessageEvent<any>) => void} */
      let onmsg = (msg) => (ws.removeEventListener("message", onmsg), resolve(msg));
      /** @type {(err: Event) => void} */
      let onerr = (err) => (ws.removeEventListener("error", onerr), reject(err));
      ws.addEventListener("message", onmsg);
      ws.addEventListener("error", onerr);
      ws.send(msg);
    });
  }

  /**
   * @typedef {object} Leaf
   * @property {(user: string) => boolean} allows
   * @property {(user: string, ...args: string[]) => void} handle
   * @property {() => string} [description]
   * @property {CommandMap} [_]
   *
   * @typedef {object} Node
   * @property {() => string} [description]
   * @property {CommandMap} [_]
   *
   * @typedef {Node | Leaf} Command
   * @typedef {Record<string, Command>} CommandMap
   */

  /**
   * @template {CommandMap} T
   * @param {T} c
   * @returns {T}
   */
  const define = (c) => c;

  /**
   * @param {CommandMap} root
   * @param {(chain: string[], v: Command) => void} visitor
   * @param {string[]} chain
   */
  const visit = (root, visitor, chain = []) => {
    for (const key of Object.keys(root)) {
      const _chain = [...chain, key];
      const child = root[key];
      visitor(_chain, child);
      if (child._) visit(child._, visitor, _chain);
    }
  };

  /**
   * @template T
   * @param {T[]} a
   */
  const unique = (a) => [...new Set(a)];

  /**
   * @template T
   */
  class Store {
    /** @type {string} */
    #key;
    /** @type {T} */
    #data;
    /** @type {(v: T) => string} */
    #serialize;
    /** @type {(v: string) => T} */
    #deserialize;
    /**
     * @param {string} key
     * @param {() => T} initial
     * @param {(v: T) => string} serialize
     * @param {(v: string) => T} deserialize
     */
    constructor(key, initial, serialize = JSON.stringify, deserialize = JSON.parse) {
      this.#key = key;
      this.#serialize = serialize;
      this.#deserialize = deserialize;
      this.#data = localStorage[key] ? this.#deserialize(localStorage[key]) : initial();
    }

    /**
     * @param {T} data
     */
    set(data) {
      this.#data = data;
      localStorage.setItem(this.#key, this.#serialize(data));
    }

    /**
     * @returns {T}
     */
    get() {
      return this.#data;
    }

    /**
     * @param {(v: T) => void} mutator
     */
    update(mutator) {
      const value = this.get();
      mutator(value);
      this.set(value);
    }
  }

  class Player {
    /** @type {string | null} */
    playing = null;
    /** @type {Map<string, HTMLAudioElement>} */
    cache = new Map();
    callbacks = {
      /** @type {Set<(name: string) => void>} */
      play: new Set(),
      /** @type {Set<(name: string) => void>} */
      stop: new Set(),
    };

    constructor(/** @type {Record<string, string>} */ sounds) {
      this.sounds = sounds;
    }

    /**
     * @param {"play" | "stop"} event
     * @param {(name: string) => void} callback
     */
    on(event, callback) {
      if (!(event in this.callbacks)) return;
      this.callbacks[event].add(callback);
    }

    /**
     * @param {"play" | "stop"} event
     * @param {(name: string) => void} callback
     */
    off(event, callback) {
      if (!(event in this.callbacks)) return;
      this.callbacks[event].delete(callback);
    }

    /**
     * @param {string | null | undefined} name
     * @returns {HTMLAudioElement | null}
     */
    get(name) {
      if (!name || !(name in this.sounds)) return null;
      const sound = "sounds/" + this.sounds[name];
      if (!this.cache.has(sound)) this.cache.set(sound, new Audio(sound));
      return this.cache.get(sound) || null;
    }

    /**
     * @param {string} name
     * @returns {Promise<void>}
     */
    async play(name) {
      if (this.playing) this.stop();
      const file = this.get(name);
      if (!file) return;

      this.callbacks.play.forEach((c) => c(name));
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
      for (const c of this.callbacks.stop) c(this.playing);
      this.playing = null;
    }
  }

  const PREFIX = "!xd";
  const RE = /:(.*)!.*PRIVMSG.*:(.*)[\r\n]*/;

  /**
   * Resolve a command descriptor from a set of arguments
   *
   * NOTE: `args` will be mutated
   * @param {CommandMap} commands
   * @param {string[]} args
   * @returns {Command | null}
   */
  function resolve(commands, args) {
    if (args.length === 0) return null;
    let root = commands[args[0]];
    if (!root) return null;

    let consumed = 1,
      len = args.length;
    while (consumed < len) {
      const name = args[consumed];
      if (!root._) break;
      if (!(name in root._)) break;
      else {
        consumed += 1;
        root = root._[name];
      }
    }
    args.splice(0, consumed);
    return root;
  }

  /**
   * @param {Record<string, boolean>} prefs
   * @param {CommandMap} commands
   * @param {string} message
   * @returns
   */
  function handle(prefs, commands, message) {
    const matches = RE.exec(message);
    if (!matches) return;

    const [user, msg] = matches.slice(1);
    if (!user || !msg) return;

    // we don't want to allow prefix-less messages when autoplay mode is not enabled
    if (!prefs.autoplay && !msg.startsWith(PREFIX)) return;
    // if message starts with prefix, it is the first argument, so skip it
    const rawArgs = msg.startsWith(PREFIX) ? msg.split(" ").slice(1) : msg.split(" ");
    let cmd = resolve(commands, rawArgs);
    if (!cmd) cmd = commands.$play;
    // resolved command must be a handler
    if (!("handle" in cmd)) return;
    // user must be allowed to execute command
    if (!cmd.allows(user)) return;
    // message must contain enough arguments
    const arity = cmd.handle.length - 1;
    if (arity > rawArgs.length) return;
    // take arguments, and join the last argument with any past arity
    const args = [...rawArgs.splice(0, arity - 1), rawArgs.join(" ")];
    cmd.handle(user, ...args);
  }

  /**
   * @param {string} channel
   * @returns {Promise<WebSocket>}
   */
  function connect(channel) {
    return new Promise((resolve, reject) => {
      const url = `${window.location.protocol.startsWith("https") ? "wss" : "ws"}://irc-ws.chat.twitch.tv`;

      /**
       * @param {any} e
       */
      function retry(e) {
        if (e) console.error(e);
        console.warn("Failed to connect, retrying...");
        ws = new WebSocket(url);
        ws.onerror = retry;
        ws.onclose = retry;
        ws.onopen = onopen;
      }
      async function onopen() {
        await async_send(ws, "CAP REQ :twitch.tv/membership");
        let res = await async_send(ws, "NICK justinfan37982");
        if (res.data.startsWith(":tmi.twitch.tv 001")) {
          ws.send(`JOIN #${channel}`);
          ws.onerror = function () {};
          ws.onclose = function () {};
          ws.onopen = function () {};
          resolve(ws);
        } else {
          if (ws.readyState === WebSocket.OPEN) ws.close();
          reject(new Error("Failed to join"));
        }
      }

      let ws = new WebSocket(url);
      ws.onerror = retry;
      ws.onclose = retry;
      ws.onopen = onopen;
    });
  }

  /** @type {HTMLInputElement} */
  // @ts-expect-error
  const input = document.getElementById("channel");
  /** @type {HTMLButtonElement} */
  // @ts-expect-error
  const submit = document.getElementById("submit");

  input.onkeyup = ({ code }) => code === "Enter" && submit.click();
  submit.onclick = () => {
    window.location.hash = input.value;
    window.location.reload();
  };

  const CHANNEL = window.location.hash.substring(1);
  if (CHANNEL) {
    const player = new Player(/*[SOUNDS]*/);

    const violatee = CHANNEL;
    const prefs = new Store(`preferences.${violatee}`, () => ({ autoplay: false }));
    const violators = new Store(`violators.${violatee}`, () => unique([violatee]));
    /** @type {Store<Record<string, string>>} */
    const aliases = new Store(`aliases.${violatee}`, () => ({}));
    const commands = define({
      $play: {
        allows: (user) => violators.get().includes(user),
        /**
         * @param {string} user
         * @param {string} sound
         */
        handle(user, sound) {
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
        allows: (user) => violators.get().includes(user),
        handle(user) {
          if (!player.playing) return;
          player.stop();
          console.log(`${user} stopped ${player.playing}`);
        },
        description: () => "Stop playing the current sound",
      },
      $add: {
        allows: (user) => user === violatee,
        handle(user, username) {
          username = username.trim().toLowerCase();
          violators.update((v) => unique([...v, username]));
          console.log(`${user} added ${username} as violator`);
        },
        description: () => "Add {0} to the violators list",
      },
      $rm: {
        allows: (user) => user === violatee,
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
            allows: (user) => user === violatee,
            handle(user) {
              prefs.update((v) => (v.autoplay = true));
              console.log(`${user} enabled autoplay mode`);
            },
            description: () => "Enable autoplay mode",
          },
          off: {
            allows: (user) => user === violatee,
            handle(user) {
              prefs.update((v) => (v.autoplay = false));
              console.log(`${user} disabled autoplay mode`);
            },
            description: () => "Disable autoplay mode",
          },
        },
      },
      $alias: {
        _: {
          add: {
            allows: (user) => user === violatee,
            handle(user, name, as) {
              name = name.toLowerCase();
              as = as.toLowerCase();
              const exists = name in aliases.get();
              aliases.update((v) => (v[name] = as));
              console.log(`${user} ${exists ? "updated" : "added"} an alias: ${name} -> ${as}`);
            },
            description: () => "Add {0} as an alias for {1}",
          },
          rm: {
            allows: (user) => user === violatee,
            handle(user, name) {
              name = name.toLowerCase();
              aliases.update((v) => delete v[name]);
              console.log(`${user} removed an alias: ${name}`);
            },
            description: () => "Remove {0} as an alias",
          },
        },
      },
    });

    // command table
    {
      // @ts-expect-error
      const tbody = document.getElementById("commands").getElementsByTagName("tbody")[0];

      const row = tbody.insertRow();
      const commandCell = row.insertCell();
      commandCell.appendChild(document.createTextNode("!xd {0}"));
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
        cmd.appendChild(document.createTextNode(`!xd ${chain.join(" ")} ${args}`));

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
        copyButton.textContent = `!xd ${sound}`;
        let clicked = false;
        copyButton.onclick = async () => {
          if (clicked) return;
          // @ts-expect-error
          await navigator.clipboard.writeText(copyButton.textContent);
          copyButton.textContent = "Copied!";
          clicked = true;
          setTimeout(() => {
            copyButton.textContent = `!xd ${sound}`;
            clicked = false;
          }, 1000);
        };

        const playCell = row.insertCell();
        const playButton = document.createElement("button");
        const _stop = () => player.stop();
        const _play = () => player.play(sound);
        player.on("play", (name) => {
          if (name !== sound) return;
          playButton.textContent = `⏹ ${sound}`;
          playButton.onclick = _stop;
        });
        player.on("stop", (name) => {
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
    function onmessage({ data: message }) {
      if (message.includes("PING")) return ws.send("PONG :tmi.twitch.tv");
      handle(prefs.get(), commands, message);
    }

    let ws = await connect(CHANNEL);
    ws.onclose = onclose;
    ws.onmessage = onmessage;

    console.log("Connected");
    console.log("channel", CHANNEL);
    console.log("prefix", PREFIX);
    console.log("commands", Object.keys(commands));
    console.log("preferences", prefs.get());
    console.log("violatee", violatee);
    console.log("violators", violators.get());
    console.log("aliases", aliases.get());
    console.log("sounds", player.sounds);
  }
})();
