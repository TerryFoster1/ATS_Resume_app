import MarketingLandingPage from "@/components/MarketingLandingPage";
import { createMarketingMetadata, getMarketingPage } from "@/lib/marketingPages";

export const metadata = createMarketingMetadata("resume-builder");

export default function ResumeBuilderPage() {
  return <MarketingLandingPage page={getMarketingPage("resume-builder")} />;
}
