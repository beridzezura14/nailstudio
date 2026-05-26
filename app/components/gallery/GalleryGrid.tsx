import Image from "next/image";

const galleryItems = [
  {
    src: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=85",
    title: "კლასიკური მოვლა",
  },
  {
    src: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=85",
    title: "ნაზი ფერი",
  },
  {
    src: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=85",
    title: "ფორმა და სიგრძე",
  },
  {
    src: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=900&q=85",
    title: "გელ-ლაქი",
  },
  {
    src: "https://images.unsplash.com/photo-1604902396830-aca29e19b067?auto=format&fit=crop&w=900&q=85",
    title: "პედიკიური",
  },
  {
    src: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=900&q=85",
    title: "დეტალი",
  },
];

export default function GalleryGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {galleryItems.map((item, index) => (
        <article
          key={item.src}
          className={index === 0 ? "sm:col-span-2 lg:col-span-1" : ""}
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-[#dfe6d8]">
            <Image
              src={item.src}
              alt={item.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
              priority={index < 2}
            />
          </div>
          <h2 className="mt-3 text-sm font-black uppercase tracking-[0.16em]">
            {item.title}
          </h2>
        </article>
      ))}
    </div>
  );
}
