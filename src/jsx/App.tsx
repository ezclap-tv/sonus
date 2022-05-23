import { h, Fragment } from "preact";
import type { CommandMap } from "../core/command";
import type { Player } from "../core/player";
import Commands from "./Commands";
import Sounds from "./Sounds";
import Channel from "./Channel";
import Prefix from "./Prefix";
import Preferences from "./Preferences";
import { NavBar, NavItem } from "./common/Nav";
import Aliases from "./Aliases";

const App = ({
  commands,
  player,
  channel,
}: {
  commands: CommandMap;
  player: Player;
  channel?: string;
}) => (
  <>
    <Channel channel={channel} />
    {channel && (
      <>
        <NavBar>
          <NavItem label="Commands" active>
            <Commands commands={commands} />
          </NavItem>
          <NavItem label="Sounds">
            <Sounds player={player} />
          </NavItem>
          <NavItem label="Aliases">
            <Aliases player={player} />
          </NavItem>
          <NavItem label="Settings">
            <Prefix />
            <Preferences />
          </NavItem>
        </NavBar>
      </>
    )}
  </>
);

export default App;
