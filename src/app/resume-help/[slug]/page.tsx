import { metadataForHub, SeoHubPage, staticParamsForHub } from "@/lib/seoPageRoute";

export function generateStaticParams() {
  return staticParamsForHub("resume-help");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return metadataForHub("resume-help", params.slug);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <SeoHubPage hub="resume-help" slug={params.slug} />;
}
