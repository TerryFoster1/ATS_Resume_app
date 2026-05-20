import type { Metadata } from "next";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import AppFooter from "@/components/AppFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Ladder",
  description:
    "Position your real experience for specific roles with recruiter-style resume and cover letter guidance."
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
