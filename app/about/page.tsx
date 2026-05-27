import type { Metadata } from "next";
import AboutHero from "../components/about/AboutHero";
import AboutImageStrip from "../components/about/AboutImageStrip";
import AboutValues from "../components/about/AboutValues";
import Header from "../components/Header";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "ჩვენ შესახებ",
  description:
    "გაიგე მეტი ფრჩხილის სტუდიის სამუშაო პროცესზე, სისუფთავის სტანდარტებზე და ზუსტ ონლაინ დაჯავშნაზე.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "ჩვენ შესახებ | ფრჩხილის სტუდია",
    description:
      "სუფთა პროცესი, მშვიდი გარემო და ზუსტად დაგეგმილი ვიზიტები ფრჩხილის მოვლისთვის.",
    url: "/about",
  },
};

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
