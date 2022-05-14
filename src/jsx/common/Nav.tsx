import { h, Fragment, type VNode, type ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import "./Nav.css";

/** Transform a single node into an array for convenience */
function normalize<T>(children: VNode<T> | VNode<T>[]) {
  return Array.isArray(children) ? children : [children];
}

type Props = {
  label: string;
  active?: boolean;
  children?: ComponentChildren;
};

export const NavItem = ({ children }: Props) => {
  return <>{children}</>;
};

export const NavBar = ({
  children,
}: {
  children: VNode<Props> | VNode<Props>[];
}) => {
  const tabs = normalize(children);
  const [activeTab, setActiveTab] = useState(() => tabs[0]?.props.label);

  return (
    <div class="nav">
      <nav class="nav-header">
        <ul>
          {tabs.map((tab) => {
            const select = () => setActiveTab(tab.props.label);
            return (
              <li
                key={tab.props.label}
                class={tab.props.label === activeTab ? "active" : ""}
                onClick={select}
                onKeyUp={({ code }) => code === "Enter" && select()}
                tabIndex={0}
              >
                <a>{tab.props.label}</a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div class="nav-body">
        {tabs.find((tab) => tab.props.label === activeTab)}
      </div>
    </div>
  );
};
