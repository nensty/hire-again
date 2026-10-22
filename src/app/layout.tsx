import type { Metadata, Viewport } from "next";
import { Header, Footer } from "@/components/layout";
import "./globals.css";
import "./discovery.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "People I’d Hire Again",
    template: "%s · People I’d Hire Again",
  },
  description:
    "Find people from the PandaDoc community by name, role, or skill. Open their original post or profile and start a conversation.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "People I’d Hire Again",
    title: "People I’d Hire Again",
    description: "No noise. Just good people finding each other.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F3EC",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
