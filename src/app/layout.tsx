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
import { NotificationOptInPrompt } from "@/components/NotificationOptInPrompt";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

/**
 * Sets data-theme on <html> before first paint so there is no flash of the
 * wrong theme. Runs as a plain, synchronous inline script (first thing in
 * <body>) rather than importing src/lib/theme.ts, because it must execute
 * before React hydrates -- it intentionally mirrors resolveInitialTheme's
 * logic in plain JS. Wrapped in try/catch because localStorage can throw in
 * some privacy modes.
 */
const noFlashThemeScript = `(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();`;

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
        <script
          dangerouslySetInnerHTML={{ __html: noFlashThemeScript }}
          suppressHydrationWarning
        />
        <ClerkProvider
          appearance={clerkAppearance}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
        >
          {children}
          <NotificationOptInPrompt />
        </ClerkProvider>
      </body>
    </html>
  );
}
