import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "מרכנפיל — לירה לבנה ליום שחור",
  description: "ניהול כלכלי חכם מבוסס AI — בנקאי, חכם, מבוסס Gemini",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "מרכנפיל",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/merkanpil.png", sizes: "1254x1254", type: "image/png" },
      { url: "/merkanpil.png", type: "image/svg+xml" },
    ],
    apple: [{ url: "/merkanpil.png", sizes: "1254x1254", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3d4f2f" },
    { media: "(prefers-color-scheme: dark)", color: "#121510" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`}>
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
