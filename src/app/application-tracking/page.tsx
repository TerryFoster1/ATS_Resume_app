import MarketingLandingPage from "@/components/MarketingLandingPage";
import { createMarketingMetadata, getMarketingPage } from "@/lib/marketingPages";

export const metadata = createMarketingMetadata("application-tracking");

export default function ApplicationTrackingPage() {
  return <MarketingLandingPage page={getMarketingPage("application-tracking")} />;
}
