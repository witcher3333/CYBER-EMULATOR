import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CYBER EMULATOR - Synthwave Login Portal",
  description: "Retro-futuristic gaming console login portal with interactive parallax graphics",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0a001a] text-white selection:bg-[#ff007f] selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
