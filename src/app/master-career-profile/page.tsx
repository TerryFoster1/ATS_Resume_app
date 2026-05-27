import MarketingLandingPage from "@/components/MarketingLandingPage";
import { createMarketingMetadata, getMarketingPage } from "@/lib/marketingPages";

export const metadata = createMarketingMetadata("master-career-profile");

export default function MasterCareerProfilePage() {
  return <MarketingLandingPage page={getMarketingPage("master-career-profile")} />;
}
