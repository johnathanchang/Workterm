import { useId, useRef, useState } from "react";

// Lower case, no accents: "Université" matches "univ".
const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// Names that start with what was typed come first, then names whose words start with each typed word ("wat" finds
// "University of Waterloo"). Each group keeps the A to Z order of the list.
function filter(options: string[], typed: string): string[] {
  const q = plain(typed.trim());
  if (!q) return options;
  // "comp e" finds "Computer Engineering": every typed word starts some word in the name.
  const typedWords = q.split(/\s+/);
  const starts: string[] = [];
  const words: string[] = [];
  for (const o of options) {
    const name = plain(o);
    if (name.startsWith(q)) starts.push(o);
    else if (typedWords.every((t) => name.split(/[\s(/–-]+/).some((w) => w.startsWith(t)))) words.push(o);
  }
  return [...starts, ...words];
}

// A text box with a dropdown that narrows as you type. The options stay in the order given (A to Z).
// Students can still type a name that is not in the list.
export default function Suggest({
  label,
  options,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const shown = filter(options, value);
  const isOpen = open && shown.length > 0 && !(shown.length === 1 && shown[0] === value);

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
    <label className="suggest">
      {label}
      <input
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={isOpen && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        maxLength={100}
        required
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        // Opens on a click or on typing, not on focus, so the "fill out this field" bubble is not hidden by the list.
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            move(Math.min(active + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            move(Math.max(active - 1, 0));
          } else if (e.key === "Enter" && isOpen && active >= 0) {
            e.preventDefault();
            pick(shown[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {isOpen && (
        <ul className="suggest-list" id={listId} role="listbox" ref={listRef}>
          {shown.map((o, i) => (
            <li
              key={o}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
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
