import { metadataForHub, SeoHubPage, staticParamsForHub } from "@/lib/seoPageRoute";

export function generateStaticParams() {
  return staticParamsForHub("career-transitions");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return metadataForHub("career-transitions", params.slug);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <SeoHubPage hub="career-transitions" slug={params.slug} />;
}
