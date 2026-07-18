import Link from "next/link";

export default function HomeHero() {
  return (
    <section className="relative min-h-[calc(100svh-62px)] overflow-hidden border-b border-[#d5ddd0]">
      <div className="absolute inset-0">
        <div
          className="h-full w-full bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1610992015762-45dca7fa3a85?auto=format&fit=crop&w=1800&q=85)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,23,22,0.84),rgba(21,23,22,0.48)_52%,rgba(21,23,22,0.16))]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-92px)] max-w-7xl items-end px-4 pb-10 pt-24 sm:px-6 md:px-10 md:pb-14">
        <div className="max-w-4xl text-white">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.34em] text-[#dfe8d5] sm:tracking-[0.42em]">
            პრემიუმ ფრჩხილის მოვლა თბილისში
          </p>
          <h1 className="max-w-4xl text-3xl font-black uppercase leading-[0.9] tracking-normal sm:text-5xl">
            ფრჩხილის მოვლა მშვიდი, ზუსტი და სუფთა პროცესით
          </h1>
          <div className="mt-8 grid max-w-3xl gap-5 border-t border-white/30 pt-6 md:grid-cols-[1fr_auto] md:items-center">
            <p className="text-sm leading-7 text-white/84 sm:text-base sm:leading-8">
              მანიკური, პედიკური, დაგრძელება და მოვლა ერთ სივრცეში. აირჩიე
              სერვისი, სპეციალისტი და თავისუფალი დრო პირდაპირ საიტიდან.
            </p>
            <Link
              href="#services"
              className="w-fit bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-[#151716] transition-colors hover:bg-[#dfe8d5]"
            >
              დაჯავშნა
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
