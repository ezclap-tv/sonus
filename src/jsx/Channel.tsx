import { h } from "preact";
import InlineInput from "./common/InlineInput";
import Tooltip from "./common/Tooltip";

const Channel = ({ channel }: { channel?: string }) => {
  return (
    <Tooltip label="Target channel">
      <InlineInput
        value={channel}
        placeholder="channel"
        onSubmit={(v) => {
          window.location.hash = v;
          window.location.reload();
        }}
      />
    </Tooltip>
  );
};

export default Channel;
