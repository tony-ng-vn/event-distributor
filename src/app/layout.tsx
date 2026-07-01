/**
 * Root layout — wraps every page.
 *
 * - ClerkProvider: sign-in/session for the whole app
 * - Geist fonts + globals.css design tokens
 * - metadata: browser tab title and SEO description
 */
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/** Match Clerk sign-in UI to our black/white Luma-style theme. */
const clerkAppearance = {
  variables: {
    colorPrimary: "#0a0a0a",
    colorText: "#0a0a0a",
    colorBackground: "#ffffff",
  },
  elements: {
    formButtonPrimary:
      "rounded-full bg-foreground text-white hover:bg-foreground/90",
  },
} as const;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Event Radar — Shared Luma Feed",
  description:
    "Private shared Luma feed for your group — see who's interested in each event.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <ClerkProvider
          appearance={clerkAppearance}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
