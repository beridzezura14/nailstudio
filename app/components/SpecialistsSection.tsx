"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Specialist {
  id: string;
  name: string;
}

const specialistImages = [
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=85",
];

export default function SpecialistsSection() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);

  const handleSpecialistSelect = (specialistId: string) => {
    window.dispatchEvent(
      new CustomEvent("nail-studio:book-specialist", {
        detail: { specialistId },
      })
    );
  };

  useEffect(() => {
    const fetchSpecialists = async () => {
      const { data, error } = await supabase
        .from("specialists")
        .select("id, name")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (error) return;
      setSpecialists(data || []);
    };

    fetchSpecialists();

    const channel = supabase
      .channel("public-specialists")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialists" },
        fetchSpecialists
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section
      id="specialists"
      className="bg-[#f7f8f5] px-4 py-20 text-[#151716] sm:px-6 md:px-10 md:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid gap-6 md:grid-cols-[0.85fr_1fr] md:items-end">
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.34em] text-[#7b8a67]">
              სპეციალისტები
            </p>
            <h2 className="text-4xl font-black uppercase leading-none tracking-normal sm:text-5xl md:text-6xl">
              გამოცდილება, რომელიც დეტალში ჩანს
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-[#586256] sm:text-base sm:leading-8">
            თითოეული სპეციალისტი მუშაობს საკუთარ კალენდართან და იმ სერვისებთან,
            რომელსაც რეალურად ასრულებს. დაჯავშნისას თავისუფალი დრო სწორედ ამით
            ითვლება.
          </p>
        </div>

        {specialists.length ? (
          <div
            className={`grid gap-4 ${
              specialists.length === 1 ? "md:grid-cols-1" : "md:grid-cols-2"
            }`}
          >
            {specialists.map((specialist, index) => (
              <button
                key={specialist.id}
                type="button"
                onClick={() => handleSpecialistSelect(specialist.id)}
                title="არჩევა"
                className="group border border-[#dfe6d8] bg-white text-left transition-all hover:-translate-y-1 hover:border-[#151716] hover:shadow-[0_18px_55px_rgba(21,23,22,0.12)] focus:outline-none focus:ring-2 focus:ring-[#151716] cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[5/4]">
                  <Image
                    src={specialistImages[index % specialistImages.length]}
                    alt={`${specialist.name} სპეციალისტი`}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 grid place-items-center bg-[#151716]/0 transition-colors group-hover:bg-[#151716]/42">
                    <span className="font-caps translate-y-2 border border-white bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#151716] opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                      არჩევა
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-2xl font-black">{specialist.name}</h3>
                  <p className="mt-2 text-sm font-bold text-[#586256]">
                    ფრჩხილის მოვლის სპეციალისტი
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="border border-[#dfe6d8] bg-white p-5 text-sm font-bold text-[#586256]">
            სპეციალისტები ჯერ არ არის დამატებული.
          </p>
        )}
      </div>
    </section>
  );
}
