import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { CommandPaletteProvider } from "@/components/ui/CommandPalette/CommandPalette";
import { GlobalShortcuts } from "@/components/GlobalShortcuts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fintrack",
  description: "Pilotez votre trésorerie. Simulez vos décisions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <CommandPaletteProvider>
              <GlobalShortcuts />
              {children}
            </CommandPaletteProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
