import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
const imageUrl = new URL(`${basePath}/og.png`, metadataBase).toString();

export const metadata: Metadata = {
  metadataBase,
  title: "Wildfire Intelligence — Global Incident Analysis",
  description:
    "A provenance-forward historic wildfire evidence atlas with clearly separated research scenarios.",
  openGraph: {
    title: "Wildfire Intelligence — Global Incident Analysis",
    description:
      "Explore sampled CEMS incident evidence, NASA POWER context, and clearly labeled illustrative forecasts.",
    images: [{ url: imageUrl, width: 1200, height: 630, alt: "Wildfire Intelligence global incident globe" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wildfire Intelligence — Global Incident Analysis",
    description:
      "A scientifically explicit historic wildfire replay and research-forecasting workbench.",
    images: [imageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
