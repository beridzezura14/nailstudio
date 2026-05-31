import Image from "next/image";
import Link from "next/link";

export default function AboutHero() {
  return (
    <section className="px-4 py-16 sm:px-6 md:px-10 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.34em] text-[#7b8a67]">
            ჩვენ შესახებ
          </p>
          <h1 className="text-3xl font-black uppercase leading-none tracking-normal sm:text-5xl">
            ფრჩხილის მოვლა მშვიდი, ზუსტი და სუფთა პროცესით
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-[#586256] sm:text-base sm:leading-8">
            სტუდია შეიქმნა ადამიანებისთვის, ვისაც სურს ლამაზი შედეგი ზედმეტი
            მოლოდინისა და გაურკვეველი დროების გარეშე. თითოეული ვიზიტი იგეგმება
            სერვისის რეალური ხანგრძლივობით და სპეციალისტის თავისუფალი
            კალენდრით.
          </p>
          <Link
            href="/#services"
            className="mt-8 inline-block bg-[#151716] px-6 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-colors hover:bg-[#2f3430]"
          >
            დაჯავშნა
          </Link>
        </div>

        <div className="relative aspect-[4/5] overflow-hidden lg:aspect-[5/6]">
          <Image
            src="https://images.unsplash.com/photo-1610992015762-45dca7fa3a85?auto=format&fit=crop&w=1200&q=85"
            alt="ფრჩხილის სტუდიის სამუშაო სივრცე"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        </div>
      </div>
    </section>
  );
}
