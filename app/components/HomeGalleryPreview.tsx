import Image from "next/image";
import Link from "next/link";

const galleryPreview = [
  {
    src: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=85",
    alt: "ნაზი მანიკური",
  },
  {
    src: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=85",
    alt: "ფრჩხილის მოვლის პროცესი",
  },
  {
    src: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=85",
    alt: "ფრჩხილის დიზაინი",
  },
];

export default function HomeGalleryPreview() {
  return (
    <section className="bg-[#eef2ea] px-4 py-20 sm:px-6 md:px-10 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.34em] text-[#7b8a67]">
              გალერეა
            </p>
            <h2 className="text-4xl font-black uppercase leading-none tracking-normal sm:text-5xl md:text-6xl">
              ნამუშევრები
            </h2>
          </div>
          <Link
            href="/gallery"
            className="w-fit border border-[#151716] px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] transition-colors hover:bg-[#151716] hover:text-white"
          >
            სრული გალერეა
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {galleryPreview.map((item) => (
            <div key={item.src} className="relative aspect-[4/5] overflow-hidden">
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
