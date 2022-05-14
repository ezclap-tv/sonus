import { h } from "preact";
import { useStore } from "../core/store";
import Stores from "../data";

const Aliases = () => {
  const aliases = useStore(Stores.aliases);

  const deleteAlias = (name: string) => Stores.aliases.update(v => {
    const aliases = { ...v }
    delete aliases[name]
    return aliases
  })

  return (
    <table>
      <thead>
        <tr>
          <th>Alias</th>
          <th>Command</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(aliases).map(([alias, command]) => (
          <tr>
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
