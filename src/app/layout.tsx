import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEL — Discover your style through your music",
  description: "Discover your style through your music. Connect with Spotify to get started.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0a0a0a]">
        {children}
      </body>
    </html>
  );
}
