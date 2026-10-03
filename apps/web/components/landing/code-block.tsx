import { cn } from "@/lib/cn";

/** Minimal code display. No syntax highlighter dependency; one accent for strings. */
export function CodeBlock({
  code,
  title,
  className,
}: {
  code: string;
  title?: string;
  className?: string;
}) {
  const lines = code.replace(/^\n/, "").split("\n");
  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-line bg-ink text-paper", className)}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-paper/60">
          <span className="font-mono">{title}</span>
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3.5 text-[13px] leading-6">
        <code className="font-mono">
          {lines.map((l, i) => (
            <span key={i} className="block">
              {highlight(l)}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function highlight(line: string) {
  const parts = line.split(/("[^"]*"|'[^']*'|`[^`]*`|\/\/.*$)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    if (/^["'`]/.test(p))
      return (
        <span key={i} className="text-money-soft">
          {p}
        </span>
      );
    if (p.startsWith("//"))
      return (
        <span key={i} className="text-paper/45">
          {p}
        </span>
      );
    return <span key={i}>{p}</span>;
  });
}
