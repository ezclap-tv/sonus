import { h } from "preact";
import { useState } from "preact/hooks";

const Copy = ({
  text,
  delay = 1000 /*ms*/,
}: {
  text: string;
  delay?: number;
}) => {
  const [clicked, setClicked] = useState(false);
  const onCopy = async () => {
    if (clicked) return;
    setClicked(true);
    await navigator.clipboard.writeText(text);
    setTimeout(() => setClicked(false), delay);
  };
  return (
    <button
      onClick={() => onCopy()}
      onKeyUp={({ code }) => code === "Enter" && onCopy()}
    >
      {clicked ? "✔️" : text}
    </button>
  );
};

export default Copy;
