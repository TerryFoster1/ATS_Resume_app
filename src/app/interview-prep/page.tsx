import MarketingLandingPage from "@/components/MarketingLandingPage";
import { createMarketingMetadata, getMarketingPage } from "@/lib/marketingPages";

export const metadata = createMarketingMetadata("interview-prep");

export default function InterviewPrepPage() {
  return <MarketingLandingPage page={getMarketingPage("interview-prep")} />;
}
