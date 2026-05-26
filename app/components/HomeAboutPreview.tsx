import Image from "next/image";
import Link from "next/link";

export default function HomeAboutPreview() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 md:px-10 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className="relative aspect-[4/5] overflow-hidden lg:aspect-[5/4]">
          <Image
            src="https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=1200&q=85"
            alt="მოვლილი ფრჩხილები"
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.34em] text-[#7b8a67]">
            ჩვენ შესახებ
          </p>
          <h2 className="text-4xl font-black uppercase leading-none tracking-normal sm:text-5xl md:text-6xl">
            სუფთა პროცესი და მშვიდი შედეგი
          </h2>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-[#586256] sm:text-base sm:leading-8">
            ჩვენი მიზანია ვიზიტი იყოს მარტივი, ზუსტი და კომფორტული. დროები
            ითვლება სერვისის ხანგრძლივობით, სპეციალისტის კალენდრით და უკვე
            არსებული ჯავშნებით, რომ ზედმეტი ლოდინი თავიდან ავირიდოთ.
          </p>
          <Link
            href="/about"
            className="mt-8 inline-block border border-[#151716] px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] transition-colors hover:bg-[#151716] hover:text-white"
          >
            მეტი ჩვენზე
          </Link>
        </div>
      </div>
    </section>
  );
}
