import { h } from "preact";
import InlineInput from "./InlineInput";

const Channel = ({ channel }: { channel?: string }) => {
  return (
    <InlineInput
      value={channel}
      placeholder="channel"
      onSubmit={(v) => {
        window.location.hash = v;
        window.location.reload();
      }}
    />
  );
};

export default Channel;
