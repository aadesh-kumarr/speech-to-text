import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Vaani Live", template: "%s · Vaani Live" },
  description: "Real-time multilingual speech transcription powered by Gemini Live.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="noise pointer-events-none fixed inset-0 z-[-1] opacity-50" />
        {children}
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
