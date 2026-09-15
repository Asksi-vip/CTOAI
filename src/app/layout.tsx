import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "BuildAI — اصنع تطبيقك بالذكاء الاصطناعي",
  description:
    "منصة تصنع تطبيقات أندرويد بالذكاء الاصطناعي: تسجيل دخول GitHub، توليد الكود، رفع المشروع، وبناء APK تلقائياً.",
  keywords: ["BuildAI", "تطبيقات", "ذكاء اصطناعي", "GitHub", "APK", "أندرويد"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
