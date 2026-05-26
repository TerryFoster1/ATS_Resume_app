import type { MetadataRoute } from "next";

const siteUrl = "https://www.careerladder.ca";

const publicRoutes = [
  "/",
  "/pricing",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/support"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: route === "/" ? `${siteUrl}/` : `${siteUrl}${route}`,
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7
  }));
}
