import { useId, useRef, useState } from "react";

// A pick-one dropdown that looks like the School and Program list (see Suggest.tsx), but you cannot type your own answer.
// It is a text box that ignores typing, so the "fill out this field" check and bubble work like the other fields.
export default function Pick({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setActive(-1);
  }

  function move(to: number) {
    setOpen(true);
    setActive(to);
    listRef.current?.children[to]?.scrollIntoView({ block: "nearest" });
  }

  return (
    <label className="suggest pick">
      {label}
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        inputMode="none"
        value={value}
        placeholder="Choose"
        required
        onChange={() => {}}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            move(Math.min(active + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            move(Math.max(active - 1, 0));
          } else if ((e.key === "Enter" || e.key === " ") && open && active >= 0) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === " " || e.key === "Enter") {
            if (e.key === " ") e.preventDefault();
            if (!open) setOpen(true);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul className="suggest-list" id={listId} role="listbox" ref={listRef}>
          {options.map((o, i) => (
            <li
              key={o}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o === value}
              className={i === active ? "on" : undefined}
              // mousedown, not click, so the pick lands before the box loses focus and closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
