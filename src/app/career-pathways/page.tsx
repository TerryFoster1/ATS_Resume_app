import MarketingLandingPage from "@/components/MarketingLandingPage";
import { createMarketingMetadata, getMarketingPage } from "@/lib/marketingPages";

export const metadata = createMarketingMetadata("career-pathways");

export default function CareerPathwaysPage() {
  return <MarketingLandingPage page={getMarketingPage("career-pathways")} />;
}
