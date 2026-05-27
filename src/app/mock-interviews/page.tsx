import MarketingLandingPage from "@/components/MarketingLandingPage";
import { createMarketingMetadata, getMarketingPage } from "@/lib/marketingPages";

export const metadata = createMarketingMetadata("mock-interviews");

export default function MockInterviewsPage() {
  return <MarketingLandingPage page={getMarketingPage("mock-interviews")} />;
}
