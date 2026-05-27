import type { Metadata } from "next";
import ContactSection from "./components/ContactSection";
import Header from "./components/Header";
import HomeAboutPreview from "./components/HomeAboutPreview";
import HomeGalleryPreview from "./components/HomeGalleryPreview";
import HomeHero from "./components/HomeHero";
import Services from "./components/Services";
import SiteFooter from "./components/SiteFooter";
import SpecialistsSection from "./components/SpecialistsSection";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <div id="top" className="min-h-screen bg-[#f7f8f5] text-[#151716]">
      <Header />

      <main>
        <HomeHero />
        <HomeAboutPreview />
        <Services />
        <SpecialistsSection />
        <HomeGalleryPreview />
        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  );
}
