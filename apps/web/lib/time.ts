/** "just now", "4m ago", "2h ago", "Oct 3, 14:02" */
export function relativeTime(unixSeconds: number | undefined, now = Date.now()): string {
  if (!unixSeconds) return "";
  const diff = Math.max(0, Math.floor(now / 1000) - unixSeconds);
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function absoluteTime(unixSeconds: number | undefined): string {
  if (!unixSeconds) return "";
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
