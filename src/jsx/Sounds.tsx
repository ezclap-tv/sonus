import { h } from "preact";
import type { Player } from "../core/player";
import { useStore } from "../core/store";
import Stores from "../data";
import Copy from "./Copy";
import Play from "./Play";

const Sounds = ({ player }: { player: Player }) => {
  const prefix = useStore(Stores.prefix);

  return (
    <table class="center-rows">
      <thead>
        <tr>
          <th>Sound</th>
          <th>Copy</th>
          <th>Play</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(player.sounds).map((sound) => (
          <tr key={sound}>
            <td>{sound}</td>
            <td>
              <Copy text={`${prefix} ${sound}`} />
            </td>
            <td>
              <Play sound={sound} player={player} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Sounds;
