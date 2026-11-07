import type { Metadata, Viewport } from "next";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "מרכנפיל — עושים סדר בכסף",
  description: "תכנון חודשי ברור של הכנסות, הוצאות והתחייבויות",
  other: {
    "app-build": process.env.RENDER_GIT_COMMIT?.slice(0, 12) ?? "local",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "מרכנפיל",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#126957" },
    { media: "(prefers-color-scheme: dark)", color: "#126957" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full antialiased">
        <ThemeProvider>
          <QueryProvider>
            <ServiceWorkerRegister />
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
