import Link from "next/link";

export default function GalleryHero() {
  return (
    <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="mb-4 text-xs font-black uppercase tracking-[0.34em] text-[#7b8a67]">
          გალერეა
        </p>
        <h1 className="text-4xl font-black uppercase leading-none tracking-normal sm:text-6xl md:text-7xl">
          ნამუშევრები და განწყობა
        </h1>
      </div>
      <Link
        href="/#services"
        className="w-fit bg-[#151716] px-6 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-colors hover:bg-[#2f3430]"
      >
        დაჯავშნა
      </Link>
    </div>
  );
}
