import { h } from "preact";
import { useStore } from "../core/store";
import Stores from "../data";
import InlineInput from "./InlineInput";

const Prefix = () => {
  const prefix = useStore(Stores.prefix);

  return <InlineInput value={prefix} onSubmit={(v) => Stores.prefix.set(v)} placeholder="command prefix" />;
};

export default Prefix;
