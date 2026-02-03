import type { Metadata } from "next";
import { Geist, Geist_Mono, Share_Tech } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const shareTech = Share_Tech({
  weight: "400",
  variable: "--font-share-tech",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blackout USA",
  description: "An educational digital experience for understanding large power grid operations.",
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
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider
            defaultOpen={false}
            style={
              {
                "--sidebar-width": "395px",
                "--sidebar-width-icon": "120px",
              } as React.CSSProperties
            }
          >
            {children}
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
