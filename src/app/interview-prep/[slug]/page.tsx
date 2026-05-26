import { metadataForHub, SeoHubPage, staticParamsForHub } from "@/lib/seoPageRoute";

export function generateStaticParams() {
  return staticParamsForHub("interview-prep");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return metadataForHub("interview-prep", params.slug);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <SeoHubPage hub="interview-prep" slug={params.slug} />;
}
