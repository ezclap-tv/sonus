import { h, Fragment } from "preact";
import { useCallback, useRef } from "preact/hooks";

const Checkbox = ({ value: checked, onSubmit }: { value?: boolean; onSubmit: (value: boolean) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = useCallback(() => inputRef.current && onSubmit(inputRef.current.checked), [inputRef]);

  return <input ref={inputRef} type="checkbox" checked={checked} onChange={() => submit()} />;
};

export default Checkbox;
