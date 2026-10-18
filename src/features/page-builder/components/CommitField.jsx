import { useState, useEffect } from "react";
export function CommitField({
  label,
  value,
  onCommit,
  type = "text",
  ...props
}) {
  const [draft, setDraft] = useState(value ?? "");
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
          if (event.key === "Escape") {
            event.stopPropagation();
            setDraft(value ?? "");
          }
        }}
      />
    </label>
  );
}
