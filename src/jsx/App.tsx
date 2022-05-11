import { h, Fragment } from "preact";
import type { CommandMap } from "../core/command";
import type { Player } from "../core/player";
import Commands from "./Commands";
import Sounds from "./Sounds";
import Channel from "./Channel";

// TODO: also display
//       - preferences
//       - prefix
//       - aliases
//       all configurable through UI

const App = ({ commands, player, channel }: { commands: CommandMap; player: Player; channel?: string }) => (
  <>
    <Channel channel={channel} />
    {channel && (
      <>
        <Commands commands={commands} />
        <Sounds player={player} />
      </>
    )}
  </>
);

export default App;
