import MarketingLandingPage from "@/components/MarketingLandingPage";
import { createMarketingMetadata, getMarketingPage } from "@/lib/marketingPages";

export const metadata = createMarketingMetadata("career-transition");

export default function CareerTransitionPage() {
  return <MarketingLandingPage page={getMarketingPage("career-transition")} />;
}
