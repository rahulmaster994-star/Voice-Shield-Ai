import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast-provider";
import SecurityShield from "@/components/SecurityShield";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VAANISHIELD — AI-Powered Voice Impersonation Defense",
  description:
    "When a voice can be cloned, voice alone cannot be trusted. VAANISHIELD adds an intelligent security layer between suspicious voices and dangerous decisions using four explainable signals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-vn-navy text-vn-text select-none">
        <ToastProvider>
          <SecurityShield />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}