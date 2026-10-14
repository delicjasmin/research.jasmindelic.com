import type { Metadata } from "next";
import { Literata, Source_Code_Pro, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-client";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--font-source-sans",
});

const literata = Literata({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-literata",
});

const sourceCode = Source_Code_Pro({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-source-code",
});

export const metadata: Metadata = {
  title: "Research — AI PDF Analysis",
  description: "Upload a PDF and ask questions powered by AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        sourceSans.variable,
        literata.variable,
        sourceCode.variable,
      )}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
