import { h, type ComponentChildren } from "preact";
import "./Tooltip.css";

const Tooltip = ({
  label,
  children,
}: {
  label: string;
  children?: ComponentChildren;
}) => {
  return (
    <div class="tooltip-trigger">
      {children}
      <div class="tooltip-body">{label}</div>
    </div>
  );
};

export default Tooltip;
