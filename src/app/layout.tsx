import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CyberGuard — AI-Powered Cyber Safety Assistant",
  description:
    "CyberGuard: chatbot, ML scam analyzer (TF-IDF + Logistic Regression), safety scorecard, scam spotter quiz and learning tracker.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
