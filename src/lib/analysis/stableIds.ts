export function stableRequirementId(text: string): string {
  const normalized = normalizeRequirementText(text);
  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `req-${slug || "item"}-${hashText(normalized)}`;
}

export function normalizeRequirementText(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 6);
}
