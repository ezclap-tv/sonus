import { h, Fragment } from "preact";
import { MutableRef, useCallback, useRef } from "preact/hooks";
import "./InlineInput.css";

const InlineInput = ({
  value,
  onSubmit,
  placeholder,
}: {
  value?: string;
  onSubmit: (value: string) => void;
  placeholder?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = useCallback(() => inputRef.current && onSubmit(inputRef.current.value), [inputRef]);

  return (
    <span class="channel-input">
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onKeyUp={({ code }) => code === "Enter" && submit()}
      />
      <button type="button" id="submit" onClick={() => submit()}>
        ➡️
      </button>
    </span>
  );
};

export default InlineInput;
