import type { MetadataRoute } from "next";
import { seoPages } from "@/lib/seoContent";

const siteUrl = "https://www.careerladder.ca";

const publicRoutes = [
  "/",
  "/career-coach",
  "/career-discovery",
  "/career-transition",
  "/career-pathways",
  "/resume-builder",
  "/interview-prep",
  "/mock-interviews",
  "/master-career-profile",
  "/application-tracking",
  "/pricing",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/support"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const seoRoutes = seoPages.map((page) => page.canonicalPath);

  return [...publicRoutes, ...seoRoutes].map((route) => ({
    url: route === "/" ? `${siteUrl}/` : `${siteUrl}${route}`,
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7
  }));
}
