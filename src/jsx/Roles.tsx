import { h } from "preact";
import { useRef } from "preact/hooks";
import type { Player } from "../core/player";
import { useStore } from "../core/store";
import Stores, { Role } from "../data";

const Aliases = () => {
  const users = useStore(Stores.users);

  const deleteUser = (name: string) =>
    Stores.users.update((v) => {
      const users = { ...v };
      delete users[name];
      return users;
    });
  const setUser = (name: string, role: Role) =>
    Stores.users.update((v) => {
      // The double assignment is intentional. The first one ensures that new aliases end up on
      // the top of the table, and the second one ensures that updating a previous alias will not
      // change its position in the table.
      const aliases = { ...v };
      aliases[name] = { name, role };
      return aliases;
    });

  const nameInputRef = useRef<HTMLInputElement>(null);
  const roleSelectRef = useRef<HTMLSelectElement>(null);

  return (
    <table class="center-rows">
      <thead>
        <tr>
          <th>User</th>
          <th>Role</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <input ref={nameInputRef} type="text" />
          </td>
          <td>
            <select ref={roleSelectRef}>
              {Object.keys(Role)
                .filter((k) => isNaN(+k))
                .map((cmd) => (
                  <option value={cmd}>{cmd}</option>
                ))}
            </select>
          </td>
          <td>
            <button
              onClick={() => {
                const [name, role] = [
                  nameInputRef.current,
                  roleSelectRef.current,
                ];
                if (name && role) {
                  setUser(name.value.toLowerCase(), (Role as any)[role.value]);
                  name.value = "";
                  role.value = role.options[0].value;
                }
              }}
            >
              ✔️
            </button>
          </td>
        </tr>
        {Object.entries(users).map(([name, user]) => (
          <tr key={name}>
            <td>{name}</td>
            <td>{Role[user.role]}</td>
            <td>
              <button onClick={() => deleteUser(name)}>❌</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Aliases;
