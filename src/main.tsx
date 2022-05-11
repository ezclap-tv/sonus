import "./water/index.css";

import { render, h } from "preact";
import Stores, { player, commands, channel, prefs, prefix, users, aliases } from "./data";
import App from "./jsx/App";
import { connect } from "./core/irc";
import { handle } from "./core/command";

// @ts-expect-error
window.Stores = Stores;

player.on("play", (s) => console.log(`Playing ${s}`));
player.on("stop", (s) => console.log(`Stopped ${s}`));

render(<App channel={channel} commands={commands} player={player} />, document.querySelector("#app")!);

if (channel) {
  async function onclose() {
    console.log("Disconnected, reconnecting...");
    ws = await connect(channel!);
    ws.onclose = onclose;
    ws.onmessage = onmessage;
  }

  function onmessage({ data: message }: MessageEvent<any>) {
    if (message.includes("PING")) return ws.send("PONG :tmi.twitch.tv");
    console.log("DEBUG", message);
    handle(users, prefs, prefix, commands, message);
  }

  let ws = await connect(channel);
  ws.onclose = onclose;
  ws.onmessage = onmessage;

  console.log("Connected");
  console.log("channel", channel);
  console.log("prefix", prefix.get());
  console.log("preferences", prefs.get());
  console.log("users", users.get());
  console.log("aliases", aliases.get());
  console.log("commands", commands);
  console.log("sounds", player.sounds);
}
