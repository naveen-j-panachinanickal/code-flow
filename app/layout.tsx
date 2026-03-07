import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quality Code",
  description: "Code Made Clear — understand your code logically, visually, and qualitatively.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
