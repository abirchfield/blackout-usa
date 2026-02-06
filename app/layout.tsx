import type { Metadata } from "next";
import { Geist, Geist_Mono, Share_Tech } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false, // Preload links use crossorigin which fails on file:// protocol
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

const shareTech = Share_Tech({
  weight: "400",
  variable: "--font-share-tech",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Blackout USA",
  description: "An educational digital experience for understanding large power grid operations.",
  icons: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${shareTech.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
