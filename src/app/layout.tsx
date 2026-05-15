import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATS Resume App",
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
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
