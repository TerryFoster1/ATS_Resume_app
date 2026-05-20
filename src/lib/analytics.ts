export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const posthog = (window as Window & {
    posthog?: { capture?: (event: string, properties?: Record<string, unknown>) => void };
  }).posthog;
  try {
    posthog?.capture?.(name, properties);
  } catch {
    // Analytics should never interrupt the application flow.
  }
}
