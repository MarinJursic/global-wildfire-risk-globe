import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
const imageUrl = new URL(`${basePath}/og.png`, metadataBase).toString();

export const metadata: Metadata = {
  metadataBase,
  title: "EMBER / Global Wildfire Intelligence",
  description:
    "A historic wildfire replay and illustrative risk-forecasting research interface.",
  openGraph: {
    title: "EMBER / Global Wildfire Intelligence",
    description:
      "Explore historic wildfire activations with normalized perimeter fixtures and clearly labeled illustrative forecasts.",
    images: [{ url: imageUrl, width: 1200, height: 630, alt: "EMBER global wildfire intelligence globe" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EMBER / Global Wildfire Intelligence",
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
