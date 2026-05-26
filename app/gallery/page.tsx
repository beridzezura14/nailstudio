import GalleryGrid from "../components/gallery/GalleryGrid";
import GalleryHero from "../components/gallery/GalleryHero";
import Header from "../components/Header";
import SiteFooter from "../components/SiteFooter";

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#151716]">
      <Header />

      <main>
        <section className="px-4 py-16 sm:px-6 md:px-10 md:py-24">
          <div className="mx-auto max-w-7xl">
            <GalleryHero />
            <GalleryGrid />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
