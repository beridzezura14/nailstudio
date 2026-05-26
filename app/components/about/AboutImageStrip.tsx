import Image from "next/image";

const images = [
  {
    src: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=85",
    alt: "მანიკურის პროცესი",
  },
  {
    src: "https://images.unsplash.com/photo-1604902396830-aca29e19b067?auto=format&fit=crop&w=900&q=85",
    alt: "პედიკიურის მოვლა",
  },
  {
    src: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=900&q=85",
    alt: "ფრჩხილის დეტალი",
  },
];

export default function AboutImageStrip() {
  return (
    <section className="bg-[#eef2ea] px-4 py-16 sm:px-6 md:px-10 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
        {images.map((image) => (
          <div key={image.src} className="relative aspect-[4/5] overflow-hidden">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
