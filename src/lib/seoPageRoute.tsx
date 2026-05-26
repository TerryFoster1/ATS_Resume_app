import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoLandingPage, { SeoJsonLd } from "@/components/SeoLandingPage";
import { getSeoPage, pagesForHub, type SeoHub } from "@/lib/seoContent";

const siteUrl = "https://www.careerladder.ca";
const socialImage = "/career-ladder-recruiter-interview.jpg";

export function staticParamsForHub(hub: SeoHub) {
  return pagesForHub(hub).map((page) => ({ slug: page.slug }));
}

export function metadataForHub(hub: SeoHub, slug: string): Metadata {
  const page = getSeoPage(hub, slug);
  if (!page) {
    return {
      title: "Career Ladder",
      robots: { index: false, follow: false }
    };
  }
  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: page.canonicalPath
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${siteUrl}${page.canonicalPath}`,
      siteName: "Career Ladder",
      type: "article",
      images: [{ url: socialImage, alt: "Recruiter reviewing career materials" }]
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [socialImage]
    }
  };
}

export function SeoHubPage({ hub, slug }: { hub: SeoHub; slug: string }) {
  const page = getSeoPage(hub, slug);
  if (!page) notFound();
  return (
    <>
      <SeoJsonLd page={page} />
      <SeoLandingPage page={page} />
    </>
  );
}
