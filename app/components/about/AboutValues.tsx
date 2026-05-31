const values = [
  "სტერილური ინსტრუმენტები და სუფთა პროცესი",
  "დროის ზუსტი კონტროლი სპეციალისტების მიხედვით",
  "მშვიდი გარემო, სადაც ვიზიტი არ ჩქარდება",
  "სერვისები, რომლებიც რეალურ ხანგრძლივობაზეა აგებული",
];

export default function AboutValues() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 md:px-10 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.34em] text-[#7b8a67]">
            როგორ ვმუშაობთ
          </p>
          <h2 className="text-2xl font-black uppercase leading-none tracking-normal sm:text-4xl">
            მთავარი პრინციპები
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {values.map((value, index) => (
            <div key={value} className="border border-[#dfe6d8] bg-[#f7f8f5] p-5">
              <p className="text-xs font-black text-[#7b8a67]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-4 text-lg font-black leading-7">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
