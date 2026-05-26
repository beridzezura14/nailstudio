import Link from "next/link";

const socialLinks = [
  { label: "ინსტაგრამი", href: "https://instagram.com/" },
  { label: "ფეისბუქი", href: "https://facebook.com/" },
  { label: "ტიკტოკი", href: "https://tiktok.com/" },
];

export default function SiteFooter() {
  return (
    <footer
      className="border-t border-[#d5ddd0] bg-[#151716] px-4 py-10 text-white sm:px-6 md:px-10"
    >
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_1.2fr] md:items-start">
        <div>
          <p className="font-black uppercase tracking-[0.24em] text-white">
            ფრჩხილის სტუდია
          </p>
          <p className="mt-3 max-w-sm text-sm leading-7 text-white/68">
            მშვიდი სივრცე მანიკურისთვის, პედიკიურისთვის და ყოველდღიური მოვლისთვის.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 text-sm font-bold text-white/76">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#dfe8d5]">
              კონტაქტი
            </p>
            <a href="tel:+995599000000" className="block hover:text-white">
              +995 599 00 00 00
            </a>
            <a href="mailto:hello@nailstudio.ge" className="block hover:text-white">
              hello@nailstudio.ge
            </a>
            <p>თბილისი, აბაშიძის 12</p>
            <p>ყოველდღე 10:00-20:00</p>
          </div>

          <div className="space-y-2 text-sm font-bold text-white/76">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#dfe8d5]">
              გვერდები
            </p>
            <Link href="/" className="block hover:text-white">
              მთავარი
            </Link>
            <Link href="/about" className="block hover:text-white">
              ჩვენ შესახებ
            </Link>
            <Link href="/gallery" className="block hover:text-white">
              გალერეა
            </Link>
          </div>
        </div>

        <div className="border-t border-white/12 pt-5 md:col-span-2">
          <div className="flex flex-col gap-4 text-xs text-white/52 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 ფრჩხილის სტუდია</p>
            <div className="flex flex-wrap gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-black uppercase tracking-[0.18em] hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
