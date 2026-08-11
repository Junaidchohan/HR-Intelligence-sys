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
        {/* AuthGuard checks the token on every route change and redirects
            unauthenticated users to /login before rendering any protected content. */}
        <AuthGuard>
          <main className="container fade-in">{children}</main>
        </AuthGuard>
        <Footer />
      </body>
    </html>
  );
}
