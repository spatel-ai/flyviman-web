import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { ThemeScript } from "@/components/theme/theme-script";
import { ToastProvider } from "@/components/ui/toast";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

// Fallback for non-Apple platforms; Apple devices use the system font.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Flyviman",
    template: "%s · Flyviman",
  },
  description:
    "Search, compare and book scheduled flights, private charters, helicopters, empty legs and air ambulance transfers in one place.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

/**
 * Every page is rendered per request, never served from a prerendered
 * shell: the Content-Security-Policy's nonce is new on each response
 * (`src/proxy.ts`), and Next.js can put it only on scripts it renders for
 * that request. `instant = false` allows this layout to block on it.
 */
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    // The theme script sets `data-theme` before React loads, so the
    // attribute can differ from what the server rendered.
    <html
      lang="en"
      className={`${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
