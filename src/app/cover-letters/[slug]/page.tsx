import { metadataForHub, SeoHubPage, staticParamsForHub } from "@/lib/seoPageRoute";

export function generateStaticParams() {
  return staticParamsForHub("cover-letters");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return metadataForHub("cover-letters", params.slug);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <SeoHubPage hub="cover-letters" slug={params.slug} />;
}
