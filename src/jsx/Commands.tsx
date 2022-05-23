import { h } from "preact";
import { CommandMap, visit } from "../core/command";
import { useStore } from "../core/store";
import Stores from "../data";

const Commands = ({ commands }: { commands: CommandMap }) => {
  const prefix = useStore(Stores.prefix);

  const rows: h.JSX.Element[] = [];
  visit(commands, (chain, node) => {
    if (!("handle" in node)) return;

    const arity = node.handle.length;
    const argsText = Array(arity > 1 ? arity - 1 : 0)
      .fill(0)
      .map((_, i) => `{${i}}`)
      .join(" ");

    const text = `${prefix}${chain.join(" ")} ${argsText}`;

    rows.push(
      <tr key={text}>
        <td>{text}</td>
        <td>{node.description ?? "🤷"}</td>
        <td>{node.example?.(prefix)}</td>
      </tr>,
    );
  });

  return (
    <table>
      <thead>
        <tr>
          <th>Command</th>
          <th>Description</th>
          <th>Example</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
};

export default Commands;
