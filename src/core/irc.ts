async function async_send(ws: WebSocket, msg: string): Promise<MessageEvent<any>> {
  return new Promise((resolve, reject) => {
    let onmsg = (msg: MessageEvent<any>): void => (ws.removeEventListener("message", onmsg), resolve(msg));
    let onerr = (err: Event): void => (ws.removeEventListener("error", onerr), reject(err));
    ws.addEventListener("message", onmsg);
    ws.addEventListener("error", onerr);
    ws.send(msg);
  });
}

const sleep = async (delay: number) => new Promise((done) => setTimeout(done, delay));

let delay = 1000;

export function connect(channel: string, handler: (message: string) => void) {
  const url = `${window.location.protocol.startsWith("https") ? "wss" : "ws"}://irc-ws.chat.twitch.tv`;

  function onerror(error: any) {
    if (error) console.log(error);
  }

  async function onclose() {
    console.warn(`WebSocket closed, reconnecting in ${delay / 1000}s`);

    await sleep(delay);
    if (delay < 10000) delay += 1000;

    console.log("Reconnecting...");

    ws = new WebSocket(url);
    ws.onerror = onerror;
    ws.onclose = onclose;
    ws.onopen = onopen;
    ws.onmessage = onmessage;
  }

  async function onopen() {
    await async_send(ws, "CAP REQ :twitch.tv/membership");
    let res = await async_send(ws, "NICK justinfan37982");
    if (res.data.startsWith(":tmi.twitch.tv 001")) {
      ws.send(`JOIN #${channel}`);
    } else if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }

  function onmessage(event: MessageEvent<string>) {
    if (event.data.includes("PING")) return ws.send("PONG :tmi.twitch.tv");
    handler(event.data);
  }

  let ws = new WebSocket(url);
  ws.onerror = onerror;
  ws.onclose = onclose;
  ws.onopen = onopen;
  ws.onmessage = onmessage;
}
