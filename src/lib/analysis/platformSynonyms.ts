export type CanonicalPlatformFamily = "meta_ads_platform";

const META_ADS_RE =
  /\b(facebook ads manager|facebook manager experience|facebook manager|facebook ads|meta ads manager|meta ads|meta business suite|meta advertising|facebook advertising|paid meta|paid social campaigns?|paid social ads?|paid social|ad account management|campaign setup|ad spend|paid meta reporting)\b/i;

export function canonicalPlatformFamily(text: string): CanonicalPlatformFamily | null {
  if (META_ADS_RE.test(text)) return "meta_ads_platform";
  return null;
}

export function hasMetaAdsPlatformSignal(text: string): boolean {
  return canonicalPlatformFamily(text) === "meta_ads_platform";
}

export function canonicalPlatformLabel(family: CanonicalPlatformFamily): string {
  if (family === "meta_ads_platform") {
    return "Facebook Ads Manager, Meta Ads Manager, or Meta Business Suite";
  }
  return family;
}
