import { metadataForHub, SeoHubPage, staticParamsForHub } from "@/lib/seoPageRoute";

export function generateStaticParams() {
  return staticParamsForHub("recruiter-insights");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return metadataForHub("recruiter-insights", params.slug);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <SeoHubPage hub="recruiter-insights" slug={params.slug} />;
}
