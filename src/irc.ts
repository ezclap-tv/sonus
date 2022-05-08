export async function async_send(ws: WebSocket, msg: string): Promise<MessageEvent<any>> {
  return new Promise((resolve, reject) => {
    let onmsg = (msg: MessageEvent<any>): void => (ws.removeEventListener("message", onmsg), resolve(msg));
    let onerr = (err: Event): void => (ws.removeEventListener("error", onerr), reject(err));
    ws.addEventListener("message", onmsg);
    ws.addEventListener("error", onerr);
    ws.send(msg);
  });
}

export function connect(channel: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const url = `${window.location.protocol.startsWith("https") ? "wss" : "ws"}://irc-ws.chat.twitch.tv`;

    /**
     * @param {any} e
     */
    function retry(e: any) {
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
