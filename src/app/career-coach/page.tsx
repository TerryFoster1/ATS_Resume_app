import type { Metadata } from "next";
import CareerCoachClient from "@/components/CareerCoachClient";

export const metadata: Metadata = {
  title: "Career Coach | Career Ladder",
  description:
    "Explore realistic career directions with recruiter-aware coaching, transferable skill translation, and practical next steps.",
  alternates: { canonical: "/career-coach" },
  openGraph: {
    title: "Career Coach | Career Ladder",
    description:
      "Explore realistic career directions with recruiter-aware coaching, transferable skill translation, and practical next steps.",
    url: "https://www.careerladder.ca/career-coach",
    siteName: "Career Ladder",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Career Coach | Career Ladder",
    description:
      "Explore realistic career directions with recruiter-aware coaching, transferable skill translation, and practical next steps."
  }
};

export default function CareerCoachPage() {
  return (
    <main className="space-y-8">
      <CareerCoachClient />
    </main>
  );
}
