import { h } from "preact";
import { useRef } from "preact/hooks";
import type { Player } from "../core/player";
import { useStore } from "../core/store";
import Stores from "../data";

const Aliases = ({ player }: { player: Player }) => {
  const aliases = useStore(Stores.aliases);

  const deleteAlias = (name: string) =>
    Stores.aliases.update((v) => {
      const aliases = { ...v };
      delete aliases[name];
      return aliases;
    });
  const setAlias = (alias: string, command: string) => Stores.aliases.update((v) => {
    // The double assignment is intentional. The first one ensures that new aliases end up on
    // the top of the table, and the second one ensures that updating a previous alias will not
    // change its position in the table.
    const aliases = { [alias]: command, ...v };
    aliases[alias] = command;
    return aliases;
  });

  const aliasInputRef = useRef<HTMLInputElement>(null);
  const cmdSelectRef = useRef<HTMLSelectElement>(null);

  return (
    <table class="center-rows">
      <thead>
        <tr>
          <th>Alias</th>
          <th>Command</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <input ref={aliasInputRef} type="text" />
          </td>
          <td>
            <select ref={cmdSelectRef}>
              {Object.keys(player.sounds).map((cmd) => (
                <option value={cmd}>{cmd}</option>
              ))}
            </select>
          </td>
          <td>
            <button
              onClick={() => {
                const [alias, command] = [aliasInputRef.current, cmdSelectRef.current];
                if (alias && command) {
                  setAlias(alias.value, command.value);
                  alias.value = "";
                  command.value = command.options[0].value;
                };
              }}
            >
              ✔️
            </button>
          </td>
        </tr>
        {Object.entries(aliases).map(([alias, command]) => (
          <tr key={alias}>
            <td>{alias}</td>
            <td>{command}</td>
            <td><button onClick={() => deleteAlias(alias)}>❌</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Aliases;
