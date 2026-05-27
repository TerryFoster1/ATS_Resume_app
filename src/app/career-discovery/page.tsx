import MarketingLandingPage from "@/components/MarketingLandingPage";
import { createMarketingMetadata, getMarketingPage } from "@/lib/marketingPages";

export const metadata = createMarketingMetadata("career-discovery");

export default function CareerDiscoveryPage() {
  return <MarketingLandingPage page={getMarketingPage("career-discovery")} />;
}
