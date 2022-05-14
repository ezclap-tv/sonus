import { h } from "preact";
import { useStore } from "../core/store";
import Stores from "../data";
import InlineInput from "./common/InlineInput";
import Tooltip from "./common/Tooltip";

const Prefix = () => {
  const prefix = useStore(Stores.prefix);

  return (
    <Tooltip label="Command prefix">
      <InlineInput
        value={prefix}
        onSubmit={(v) => Stores.prefix.set(v)}
        placeholder="command prefix"
      />
    </Tooltip>
  );
};

export default Prefix;
