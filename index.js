(async function () {
  async function async_send(ws, msg, then) {
    return new Promise((resolve, reject) => {
      let onmsg = (msg) => (ws.removeEventListener("message", onmsg), resolve(msg));
      let onerr = (err) => (ws.removeEventListener("error", onerr), reject(err));
      ws.addEventListener("message", onmsg);
      ws.addEventListener("error", onerr);
      ws.send(msg);
    });
  }

  /**
   * @template T
   * @param {T[]} a
   */
  const unique = (a) => [...new Set(a)];

  class Store {
    #key;
    #data;
    constructor(key, initial) {
      this.#key = key;
      this.#data = JSON.parse(localStorage.getItem(key)) || initial;
    }

    set(data) {
      this.#data = data;
      localStorage.setItem(this.#key, JSON.stringify(data));
    }

    get() {
      return this.#data;
    }
  }

  class Player {
    /** @type {string | null} */
    playing = null;
    /** @type {Map<string, HTMLAudioElement} */
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
     * @param {string} name
     * @returns {HTMLAudioElement | null}
     */
    get(name) {
      if (!(name in this.sounds)) return null;
      const sound = "sounds/" + this.sounds[name];
      if (!this.cache.has(sound)) this.cache.set(sound, new Audio(sound));
      return this.cache.get(sound);
    }

    /** @param {string} name */
    async play(name) {
      if (this.playing) this.stop();
      const file = this.get(name);

      this.callbacks.play.forEach((c) => c(name));
      this.playing = name;
      return new Promise((done) => {
        file.play().then(() => {
          const ondone = () => {
            if (this.playing === name) {
              this.callbacks.stop.forEach((c) => c(this.playing));
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
      file.pause();
      file.currentTime = 0;
      this.callbacks.stop.forEach((c) => c(this.playing));
      this.playing = null;
    }
  }

  const PREFIX = "!xd";
  const RE = /:(.*)!.*PRIVMSG.*:(.*)[\r\n]*/;
  function handle(commands, message) {
    const matches = RE.exec(message);
    if (!matches) return;

    const [user, msg] = matches.slice(1);
    if (!user || !msg) return;

    const [prefix, cname, ...args] = msg.split(" ");
    if (prefix !== PREFIX) return;

    const cmd = cname.startsWith("$") ? commands[cname] : commands.$play;
    if (!cmd.allows(user)) return;

    cmd.handle(user, cname.startsWith("$") ? args : [cname].concat(args));
  }

  function connect(channel) {
    return new Promise((resolve, reject) => {
      const url = `${window.location.protocol.startsWith("https") ? "wss" : "ws"}://irc-ws.chat.twitch.tv`;

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
  const input = document.getElementById("channel");
  /** @type {HTMLButtonElement} */
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
    const violators = new Store(`violators.${violatee}`, unique([violatee, "moscowwbish"]));
    /**
     * @type {Record<string, {
     *  allows: (user: string) => boolean,
     *  handle: (user: string, args: string[]) => void,
     *  args: string[],
     *  description: string,
     * }>}
     */
    const commands = {
      $play: {
        allows: (user) => !player.playing && violators.get().includes(user),
        handle(user, args) {
          const sound = args.join();
          console.log(`${user} played ${sound}`);
          player.play(sound);
        },
        args: ["sound"],
        description: "Play the sound `sound`",
      },
      $stop: {
        allows: (user) => player.playing && violators.get().includes(user),
        handle(user, args) {
          console.log(`${user} stopped ${player.playing}`);
          player.stop();
        },
        args: [],
        description: "Stop playing the current sound",
      },
      $add: {
        allows: (user) => user === violatee,
        handle(user, args) {
          const target = args.join().trim().toLowerCase();
          console.log(`${user} added ${target} as violator`);
          violators.set(unique([...violators.get(), target]));
        },
        args: ["username"],
        description: "Add `username` to the violators list",
      },
      $rm: {
        allows: (user) => user === violatee,
        handle(user, args) {
          const target = args.join().trim().toLowerCase();
          console.log(`${user} removed ${target} as violator`);
          violators.set(violators.get().filter((u) => u !== target));
        },
        args: ["username"],
        description: "Remove `username` from the violators list",
      },
    };

    // command table
    {
      const tbody = document.getElementById("commands").getElementsByTagName("tbody")[0];

      const row = tbody.insertRow();
      const commandCell = row.insertCell();
      commandCell.appendChild(document.createTextNode("!xd sound"));
      const descriptionCell = row.insertCell();
      descriptionCell.appendChild(document.createTextNode("Play the sound `sound`"));

      for (const cmd of Object.keys(commands)) {
        const row = tbody.insertRow();
        const commandCell = row.insertCell();
        commandCell.appendChild(document.createTextNode(`!xd ${cmd} ${commands[cmd].args.join(" ")}`));
        const descriptionCell = row.insertCell();
        descriptionCell.appendChild(document.createTextNode(commands[cmd].description));
      }
    }
    // sound table
    {
      const tbody = document.getElementById("sounds").getElementsByTagName("tbody")[0];

      for (const sound of Object.keys(player.sounds)) {
        const row = tbody.insertRow();
        const soundCell = row.insertCell();
        soundCell.appendChild(document.createTextNode(sound));

        const commandCell = row.insertCell();
        const copyButton = document.createElement("button");
        commandCell.appendChild(copyButton);
        copyButton.textContent = `!xd ${sound}`;
        copyButton.onclick = async () => {
          await navigator.clipboard.writeText(copyButton.textContent);
          copyButton.textContent = "Copied!";
          setTimeout(() => (copyButton.textContent = `!xd ${sound}`), 1000);
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

    function onmessage({ data }) {
      if (data.includes("PING")) return ws.send("PONG :tmi.twitch.tv");
      handle(commands, data);
    }

    let ws = await connect(CHANNEL);
    ws.onclose = onclose;
    ws.onmessage = onmessage;

    console.log("Connected");
    console.log("channel", CHANNEL);
    console.log("prefix", PREFIX);
    console.log("commands", Object.keys(commands));
    console.log("violatee", violatee);
    console.log("violators", violators.get());
    console.log("sounds", player.sounds);
  } else {
    routes.index();
  }
})();
