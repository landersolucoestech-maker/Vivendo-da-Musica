import type { ReactNode } from "react";
import Navigation from "@/shared/components/Navigation";
import Footer from "@/shared/components/Footer";

const PublicLayout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground">
    <Navigation />
    <main className="pt-20 pb-16">
      <div className="container mx-auto px-4">{children}</div>
    </main>
    <Footer />
  </div>
);

export default PublicLayout;
