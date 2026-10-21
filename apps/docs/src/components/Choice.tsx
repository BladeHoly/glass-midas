/**
 * A choice among a few options, as chips: the same control as the playgrounds, and no native
 * popup to clash with the page's theme.
 */
export default function Choice<T extends string | number>(props: {
  label: string;
  output?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="gm-demo-control" role="group" aria-label={props.label}>
      <span>
        {props.label} {props.output && <output>{props.output}</output>}
      </span>
      <div className="pg-chips">
        {props.options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            className="gm-chip gm-chip-plain"
            aria-pressed={o.value === props.value}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
