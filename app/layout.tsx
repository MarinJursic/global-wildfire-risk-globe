import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "EMBER / Global Wildfire Intelligence",
  description:
    "An uncertainty-aware wildfire ignition risk and spread forecasting research interface.",
  openGraph: {
    title: "EMBER / Global Wildfire Intelligence",
    description:
      "Replay a major wildfire, inspect calibrated ignition risk, and compare spread forecasts with observed detections.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "EMBER / Global Wildfire Intelligence",
    description:
      "A scientifically honest wildfire forecasting and verification workbench.",
    images: ["/og.png"],
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
