import type { Metadata } from "next";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import AppFooter from "@/components/AppFooter";
import "./globals.css";

const siteUrl = "https://www.careerladder.ca";
const siteTitle = "Career Ladder | AI Resume, Cover Letter & Interview Prep";
const siteDescription =
  "Career Ladder helps you tailor your resume, cover letter, and interview prep to specific job postings so you can position your experience with more confidence.";
const socialImage = "/career-ladder-recruiter-interview.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Career Ladder"
  },
  description: siteDescription,
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "Career Ladder",
    type: "website",
    images: [
      {
        url: socialImage,
        alt: "Recruiter reviewing a resume during an interview conversation"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [socialImage]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-page">
        <AnalyticsProvider />
        <div className="app-shell">
          {children}
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
