export default function ContactSection() {
  return (
    <section
      id="contact"
      className="scroll-mt-20 bg-white px-4 py-20 text-[#151716] sm:px-6 md:px-10 md:scroll-mt-24 md:py-28"
    >
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.34em] text-[#7b8a67]">
            საკონტაქტო / მისამართი
          </p>
          <h2 className="text-3xl font-black uppercase leading-none tracking-normal sm:text-4xl md:text-5xl">
            გვიპოვე მარტივად
          </h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-[#586256] sm:text-base sm:leading-8">
            დაგვიკავშირდი ტელეფონით ან მოგვწერე სოციალურ ქსელში. მისამართზე
            მისვლამდე შეგიძლია დაგვირეკო, რომ სპეციალისტის თავისუფალი დრო
            გადავამოწმოთ.
          </p>
          <div className="mt-6 border-l-4 border-[#7b8a67] bg-[#f2f5ee] px-4 py-3 text-sm font-bold leading-6 text-[#586256]">
            წინასწარ ჩაწერა რეკომენდებულია. ჩაწერის გარეშე მოსვლისას შეიძლება
            თავისუფალი ადგილი აღარ იყოს.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-[#f2f5ee] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7b8a67]">
              ტელეფონი
            </p>
            <a
              href="tel:+995599000000"
              className="mt-3 block text-xl font-black hover:text-[#586256]"
            >
              +995 599 00 00 00
            </a>
          </div>

          <div className="bg-[#f2f5ee] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7b8a67]">
              ელფოსტა
            </p>
            <a
              href="mailto:hello@nailstudio.ge"
              className="mt-3 block text-xl font-black hover:text-[#586256]"
            >
              hello@nailstudio.ge
            </a>
          </div>

          <div className="bg-[#f2f5ee] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7b8a67]">
              მისამართი
            </p>
            <p className="mt-3 text-xl font-black">თბილისი, აბაშიძის 12</p>
          </div>

          <div className="bg-[#f2f5ee] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7b8a67]">
              სამუშაო დრო
            </p>
            <p className="mt-3 text-xl font-black">10:00-20:00</p>
            <p className="mt-1 text-sm font-bold text-[#586256]">ყოველდღე</p>
          </div>

          <div className="min-h-52 bg-[#151716] p-5 text-white sm:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#dfe8d5]">
              რუკა
            </p>
            <div className="mt-8 grid h-28 place-items-center border border-white/18 text-center text-sm font-bold leading-6 text-white/70">
              თბილისი, ვაკე, აბაშიძის 12
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
