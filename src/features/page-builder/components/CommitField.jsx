import { createContext, useContext, useState, useEffect } from "react";
// Wizard Escape dismisses the dialog; the standalone Inspector resets its field.
export const CommitFieldEscapeContext = createContext(true);
export function CommitField({
  label,
  value,
  onCommit,
  type = "text",
  ...props
}) {
  const [draft, setDraft] = useState(value ?? "");
  const resetOnEscape = useContext(CommitFieldEscapeContext);
  useEffect(() => setDraft(value ?? ""), [value]);
  return (
    <label>
      {label}
      <input
        {...props}
        type={type}
        value={draft}
        placeholder={value === undefined ? "Mixed" : props.placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (String(draft) !== String(value ?? ""))
            onCommit(type === "number" ? Number(draft) : draft);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape" && resetOnEscape) {
            event.preventDefault();
            event.stopPropagation();
            setDraft(value ?? "");
          }
        }}
      />
    </label>
  );
}
