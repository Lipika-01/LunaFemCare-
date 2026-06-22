import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import BackgroundBubbles from "@/components/BackgroundBubbles";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Outfit({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LunaFemCare — AI-Driven Women's Health & Nutrition",
  description:
    "LunaFemCare is a premium AI-driven health and nutrition platform for women, offering personalized, cycle-phase-based insights, symptom tracking, and doctor-ready reports.",
  keywords: ["women's health", "nutrition", "menstrual cycle", "AI", "PCOS", "pregnancy"],
  openGraph: {
    title: "LunaFemCare — AI-Driven Women's Health & Nutrition",
    description: "Personalized, cycle-phase-based nutrition insights powered by AI.",
    type: "website",
  },
  icons: {
    apple: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#B67664",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased min-h-screen flex flex-col relative`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <BackgroundBubbles />
          <div className="z-10 relative flex flex-col min-h-screen">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
