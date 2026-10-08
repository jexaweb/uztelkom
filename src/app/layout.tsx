import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "UZTELECOM Dealer Control",
  description:
    "UZTELECOM diler nazorati, SMS, sug'urta, hujjatlar va hisobotlar tizimi.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="uz">
      <body className="bg-slate-100 text-slate-900 antialiased">
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}