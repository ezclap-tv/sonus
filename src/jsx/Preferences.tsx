import { h, Fragment } from "preact";
import { useStore } from "../core/store";
import Stores, { Preferences, prefsDescriptions } from "../data";
import Checkbox from "./common/Checkbox";

const Preferences = () => {
  const prefs = useStore(Stores.prefs);

  return (
    <table>
      <thead>
        <tr>
          <th>Toggle</th>
          <th>Name</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(prefs).map(([key, value]) => {
          const description = prefsDescriptions[key as keyof Preferences];
          return (
            <tr>
              <td>
                <Checkbox
                  key={key}
                  value={value}
                  onSubmit={(newValue) =>
                    Stores.prefs.update((v) => ({ ...v, [key]: newValue }))
                  }
                />
              </td>
              <td>{key}</td>
              <td>{description}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default Preferences;
