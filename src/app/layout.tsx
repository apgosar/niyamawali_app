import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Noto_Sans_Gujarati, Noto_Serif_Gujarati } from "next/font/google";
import "./globals.css";
import { getLang } from "@/lib/lang";
import { I18nProvider } from "@/components/I18nProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { Splash } from "@/components/Splash";
import { SplashDonor } from "@/components/SplashDonor";
import { Suspense } from "react";

// Runs before the page paints: no opening screen for admin pages, or after it has been shown once in this app session.
const SPLASH_GATE = "try{if(sessionStorage.getItem('ns_splash')||location.pathname.indexOf('/admin')===0||location.pathname==='/offline')document.documentElement.setAttribute('data-splash','skip')}catch(e){}";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display-en" });
const displayGu = Noto_Serif_Gujarati({ subsets: ["gujarati", "latin"], variable: "--font-display-gu" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const bodyGu = Noto_Sans_Gujarati({ subsets: ["gujarati", "latin"], variable: "--font-gujarati" });

export const metadata: Metadata = {
  title: { default: "Niyamawali · Divine Sanskar Shibir", template: "%s · Niyamawali" },
  description: "Log your daily niyams, earn points and grow in sanskar, sadhana and siddhi.",
  applicationName: "Niyamawali",
  appleWebApp: { capable: true, title: "Niyamawali", statusBarStyle: "default" },
  icons: { icon: "/icons/favicon-64.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf6ec",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning className={`${display.variable} ${displayGu.variable} ${body.variable} ${bodyGu.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_GATE }} />
      </head>
      <body>
        <I18nProvider lang={lang}>
          {children}
          <Splash>
            <Suspense fallback={null}><SplashDonor /></Suspense>
          </Splash>
        </I18nProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
