import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Newsreader,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { shadcn } from "@clerk/ui/themes";
import { Providers } from "@/components/providers";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Switchboard — AI front desk for modern teams",
    template: "%s · Switchboard",
  },
  description:
    "Run bookings, customer conversations, and a text-and-audio web concierge from one multi-tenant workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable}`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ClerkProvider
          dynamic
          ui={ui}
          appearance={{
            theme: shadcn,
            elements: {
              // Clerk's fixed drawers intentionally ship without a z-index.
              // Keep checkout and its backdrop above Switchboard's sticky UI.
              drawerBackdrop: { zIndex: 9_999 },
              drawerRoot: { zIndex: 10_000 },
            },
          }}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/"
          taskUrls={{
            "choose-organization": "/session-tasks/choose-organization",
          }}
        >
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
