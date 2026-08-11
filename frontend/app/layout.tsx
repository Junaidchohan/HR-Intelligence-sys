import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Talentbase AI | Unified Lead Command",
  description: "Recruiter console for candidate sourcing, screening, and evidence review",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <AuthGuard>
          {children}
        </AuthGuard>
        <Footer />
      </body>
    </html>
  );
}
