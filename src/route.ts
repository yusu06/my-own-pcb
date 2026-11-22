export type Route = { name: "home" } | { name: "lesson"; id: string } | { name: "glossary" } | { name: "settings" } | { name: "parts" };

export function parseRoute(hash: string, knownIds: string[]): Route {
  const parts = hash.replace(/^#\/?/, "").split("/");
  if (parts[0] === "lesson" && knownIds.includes(parts[1])) return { name: "lesson", id: parts[1] };
  if (parts[0] === "glossary" || parts[0] === "settings" || parts[0] === "parts") return { name: parts[0] };
  return { name: "home" };
}
