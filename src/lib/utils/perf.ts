export function nowMs(): number {
  return Date.now();
}

export function elapsedMs(started: number): number {
  return Date.now() - started;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function logDevTiming(label: string, fields: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;
  console.info(
    `[perf:${label}] ${Object.entries(fields)
      .map(([key, value]) => `${key}=${formatValue(value)}`)
      .join(" ")}`
  );
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
