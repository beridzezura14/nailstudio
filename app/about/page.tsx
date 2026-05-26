import AboutHero from "../components/about/AboutHero";
import AboutImageStrip from "../components/about/AboutImageStrip";
import AboutValues from "../components/about/AboutValues";
import Header from "../components/Header";
import SiteFooter from "../components/SiteFooter";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#151716]">
      <Header />

      <main>
        <AboutHero />
        <AboutImageStrip />
        <AboutValues />
      </main>

      <SiteFooter />
    </div>
  );
}
