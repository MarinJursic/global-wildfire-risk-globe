import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const candidateHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const safeHost = /^[a-z0-9.-]+(?::\d+)?$/i.test(candidateHost)
    ? candidateHost
    : "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : safeHost.startsWith("localhost")
        ? "http"
        : "https";
  const metadataBase = new URL(`${protocol}://${safeHost}`);
  const imageUrl = new URL("/og.png", metadataBase).toString();

  return {
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
}

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
