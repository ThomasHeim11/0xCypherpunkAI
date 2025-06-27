import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "0xCypherpunkAI | ElizaOS AI Agent Prize",
  description:
    "AI-Powered Multi-Agent Smart Contract Auditing Platform. 11 specialized ElizaOS agents analyze Solidity code using 44,000+ audit reports. Built for the ElizaOS AI Agent Prize competition.",
  keywords: [
    "smart contract audit",
    "AI security",
    "blockchain",
    "Solidity",
    "ElizaOS",
    "multi-agent",
    "DeFi security",
    "Web3 auditing",
  ],
  authors: [{ name: "0xCypherpunkAI Team" }],
  openGraph: {
    title: "0xCypherpunkAI | ElizaOS AI Agent Prize",
    description: "AI-Powered Multi-Agent Smart Contract Auditing Platform",
    type: "website",
    siteName: "0xCypherpunkAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "0xCypherpunkAI | ElizaOS AI Agent Prize",
    description: "AI-Powered Multi-Agent Smart Contract Auditing Platform",
  },
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${inter.className} bg-dark-900 text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
