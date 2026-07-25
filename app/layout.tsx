import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
const imageUrl = new URL(`${basePath}/og.png`, metadataBase).toString();

export const metadata: Metadata = {
  metadataBase,
  title: "EMBER / Global Wildfire Intelligence",
  description:
    "An uncertainty-aware wildfire ignition risk and spread forecasting research interface.",
  openGraph: {
    title: "EMBER / Global Wildfire Intelligence",
    description:
      "Replay a major wildfire, inspect calibrated ignition risk, and compare spread forecasts with observed detections.",
    images: [{ url: imageUrl, width: 1200, height: 630, alt: "EMBER global wildfire intelligence globe" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EMBER / Global Wildfire Intelligence",
    description:
      "A scientifically honest wildfire forecasting and verification workbench.",
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
