import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AULAU — Мониторинг рыбных ресурсов Каспия",
  description: "Интеллектуальная система мониторинга и учета рыбных ресурсов Каспийского моря. Мангистауская область, Республика Казахстан.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
