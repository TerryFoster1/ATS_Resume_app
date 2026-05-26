import { metadataForHub, SeoHubPage, staticParamsForHub } from "@/lib/seoPageRoute";

export function generateStaticParams() {
  return staticParamsForHub("job-guides");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return metadataForHub("job-guides", params.slug);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <SeoHubPage hub="job-guides" slug={params.slug} />;
}
