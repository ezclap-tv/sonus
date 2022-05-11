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
          <th>Name</th>
          <th>Description</th>
          <th>&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(prefs).map(([key, value]) => {
          const description = prefsDescriptions[key as keyof Preferences];
          return (
            <tr>
              <td>{key}</td>
              <td>{description}</td>
              <td style={{ textAlign: "center" }}>
                <Checkbox
                  key={key}
                  value={value}
                  onSubmit={(newValue) => Stores.prefs.update((v) => ({ ...v, [key]: newValue }))}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default Preferences;
