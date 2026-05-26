import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/checkout/", "/dashboard/", "/outputs/"]
    },
    sitemap: "https://www.careerladder.ca/sitemap.xml"
  };
}
