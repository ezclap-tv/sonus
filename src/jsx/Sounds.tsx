import { h } from "preact";
import { useMemo } from "preact/hooks";
import type { Player } from "../core/player";
import { useStore } from "../core/store";
import Stores from "../data";
import Copy from "./Copy";
import Play from "./Play";

const Sounds = ({ player }: { player: Player }) => {
  const prefix = useStore(Stores.prefix);

  const rows = useMemo(() => {
    const rows: h.JSX.Element[] = [];
    for (const sound of Object.keys(player.sounds)) {
      rows.push(
        <tr key={sound}>
          <td>{sound}</td>
          <td>
            <Copy text={`${prefix} ${sound}`} />
          </td>
          <td>
            <Play sound={sound} player={player} />
          </td>
        </tr>
      );
    }
    return rows;
  }, [player, player.sounds, prefix]);

  return (
    <table>
      <thead>
        <tr>
          <th>Sound</th>
          <th>Copy</th>
          <th>Play</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
};

export default Sounds;
