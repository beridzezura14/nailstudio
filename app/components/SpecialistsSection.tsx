"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  SpecialistTimeOff,
  TimeOffBySpecialist,
  specialistIsTimeOffOnDate,
} from "@/lib/availability";
import { supabase } from "@/lib/supabase";

interface Specialist {
  id: string;
  name: string;
}

function formatDateString(date: Date) {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
}

const specialistImages = [
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=85",
];

export default function SpecialistsSection() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [timeOffBySpecialist, setTimeOffBySpecialist] =
    useState<TimeOffBySpecialist>({});
  const todayStr = formatDateString(new Date());

  const handleSpecialistSelect = (specialistId: string) => {
    if (specialistIsTimeOffOnDate(specialistId, timeOffBySpecialist, todayStr)) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("nail-studio:book-specialist", {
        detail: { specialistId },
      })
    );
  };

  useEffect(() => {
    const fetchSpecialists = async () => {
      const [specialistsResult, timeOffResult] = await Promise.all([
        supabase
          .from("specialists")
          .select("id, name")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("specialist_time_off")
          .select("id, specialist_id, start_date, end_date, reason"),
      ]);

      if (specialistsResult.error) return;

      const timeOff = ((timeOffResult.data || []) as SpecialistTimeOff[]).reduce<
        TimeOffBySpecialist
      >((groups, period) => {
        groups[period.specialist_id] = [
          ...(groups[period.specialist_id] || []),
          period,
        ];
        return groups;
      }, {});

      setSpecialists(specialistsResult.data || []);
      setTimeOffBySpecialist(timeOff);
    };

    fetchSpecialists();

    const channel = supabase
      .channel("public-specialists")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialists" },
        fetchSpecialists
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialist_time_off" },
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
            {specialists.map((specialist, index) => {
              const isOnVacation = specialistIsTimeOffOnDate(
                specialist.id,
                timeOffBySpecialist,
                todayStr
              );

              return (
                <button
                  key={specialist.id}
                  type="button"
                  disabled={isOnVacation}
                  onClick={() => handleSpecialistSelect(specialist.id)}
                  title={isOnVacation ? "მიუწვდომელია" : "არჩევა"}
                  className={`group border text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#151716] ${
                    isOnVacation
                      ? "cursor-not-allowed border-[#dfe6d8] bg-[#f2f5ee] opacity-70"
                      : "cursor-pointer border-[#dfe6d8] bg-white hover:-translate-y-1 hover:border-[#151716] hover:shadow-[0_18px_55px_rgba(21,23,22,0.12)]"
                  }`}
                >
                <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[5/4]">
                  <Image
                    src={specialistImages[index % specialistImages.length]}
                    alt={`${specialist.name} სპეციალისტი`}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className={`object-cover transition-transform duration-500 ${
                      isOnVacation ? "grayscale" : "group-hover:scale-105"
                    }`}
                  />
                  <div
                    className={`absolute inset-0 grid place-items-center transition-colors ${
                      isOnVacation ? "bg-[#151716]/38" : "bg-[#151716]/0 group-hover:bg-[#151716]/42"
                    }`}
                  >
                    <span
                      className={`font-caps border border-white bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#151716] transition-all ${
                        isOnVacation
                          ? "opacity-100"
                          : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                      }`}
                    >
                      {isOnVacation ? "მიუწვდომელია" : "არჩევა"}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-2xl font-black">{specialist.name}</h3>
                  <p className="mt-2 text-sm font-bold text-[#586256]">
                    ფრჩხილის მოვლის სპეციალისტი
                  </p>
                  {isOnVacation ? (
                    <p className="mt-3 inline-block bg-[#151716] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                      დროებით მიუწვდომელია
                    </p>
                  ) : null}
                </div>
              </button>
              );
            })}
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
