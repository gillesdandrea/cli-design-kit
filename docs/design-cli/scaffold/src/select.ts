export function project(value: unknown, paths: string[]): unknown {
  if (paths.length === 0) return value;
  if (Array.isArray(value)) return value.map(v => project(v, paths));
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const path of paths) {
    const [head, ...rest] = path.split(".");
    if (head === undefined) continue;
    const v = (value as Record<string, unknown>)[head];
    if (v === undefined) continue;
    if (rest.length === 0) {
      out[head] = v;
    } else {
      const nested = project(v, [rest.join(".")]);
      const prev = out[head];
      out[head] = mergeNested(prev, nested);
    }
  }
  return out;
}

function mergeNested(prev: unknown, next: unknown): unknown {
  if (prev === undefined) return next;
  if (Array.isArray(prev) && Array.isArray(next)) {
    return prev.map((p, i) => deepMerge(p, next[i]));
  }
  return deepMerge(prev, next);
}

function deepMerge(a: unknown, b: unknown): unknown {
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    return { ...(a as object), ...(b as object) };
  }
  return b ?? a;
}

export function parseSelect(s: string | undefined): string[] {
  if (!s) return [];
  return s.split(",").map(x => x.trim()).filter(Boolean);
}
