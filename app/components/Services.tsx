"use client";

import { useEffect, useMemo, useState } from "react";
import BookingForm from "./BookingForm";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "nail-studio-selected-services";

interface Service {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
}

function formatPrice(price: number) {
  return `₾${Number(price).toLocaleString("ka-GE")}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}წთ`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}სთ ${rest}წთ` : `${hours}სთ`;
}

function readStoredServiceIds() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedBookingSpecialistId, setSelectedBookingSpecialistId] = useState<
    string | null
  >(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectionReady, setSelectionReady] = useState(false);

  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [services, selectedServiceIds]
  );
  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + service.duration_minutes,
    0
  );
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, description, price, duration_minutes")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        setLoadError("სერვისების ჩატვირთვა ვერ მოხერხდა.");
        return;
      }

      const fetchedServices = data || [];
      const availableIds = new Set(fetchedServices.map((service) => service.id));
      const storedIds = readStoredServiceIds().filter((id) => availableIds.has(id));

      setLoadError("");
      setServices(fetchedServices);
      setSelectedServiceIds(storedIds);
      setSelectionReady(true);
    };

    fetchServices();

    const channel = supabase
      .channel("services-list-services")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        () => {
          fetchServices();
        }
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      fetchServices();
    }, 10000);

    const refreshOnFocus = () => {
      fetchServices();
    };

    window.addEventListener("focus", refreshOnFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  useEffect(() => {
    if (!selectionReady) return;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedServiceIds));
  }, [selectedServiceIds, selectionReady]);

  useEffect(() => {
    if (!bookingOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [bookingOpen]);

  useEffect(() => {
    const openSpecialistBooking = (event: Event) => {
      const specialistId = (event as CustomEvent<{ specialistId?: string }>).detail
        ?.specialistId;
      if (!specialistId) return;

      setSelectedBookingSpecialistId(specialistId);
      setBookingOpen(true);
    };

    window.addEventListener("nail-studio:book-specialist", openSpecialistBooking);

    return () => {
      window.removeEventListener("nail-studio:book-specialist", openSpecialistBooking);
    };
  }, []);

  const toggleService = (id: string) => {
    setSelectedBookingSpecialistId(null);
    setSelectedServiceIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
    setBookingOpen(false);
  };

  const clearSelection = () => {
    setSelectedServiceIds([]);
    setSelectedBookingSpecialistId(null);
    setBookingOpen(false);
  };

  return (
    <section
      id="services"
      className="bg-[#eef2ea] px-5 py-24 text-[#151716] md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-end">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.42em] text-[#7b8a67]">
              სერვისები
            </p>

            <h2 className="text-5xl font-black uppercase leading-[0.9] tracking-normal md:text-7xl">
              სილამაზის მენიუ
            </h2>
          </div>

          <p className="max-w-xl text-base leading-8 text-[#586256]">
            მონიშნე ერთი ან რამდენიმე სერვისი. არჩევანი შენახული დარჩება და
            დაჯავშნისას დრო ჯამურად დაითვლება.
          </p>
        </div>

        {loadError ? (
          <p className="border border-[#c9d2c3] bg-white px-5 py-4 text-sm font-bold text-[#586256]">
            {loadError}
          </p>
        ) : (
          <div className="border-t border-[#c9d2c3]">
            {services.map((service, index) => {
              const isSelected = selectedServiceIds.includes(service.id);

              return (
                <div
                  key={service.id}
                  className={`group grid gap-6 border-b border-[#c9d2c3] px-8 py-8 transition md:grid-cols-[0.15fr_1.2fr_0.35fr_0.3fr_0.25fr] md:items-start ${
                    isSelected ? "bg-white" : "hover:bg-white/80"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#7b8a67]">
                    {String(index + 1).padStart(2, "0")}
                  </p>

                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-normal md:text-4xl">
                      {service.title}
                    </h3>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#586256]">
                      {service.description}
                    </p>
                  </div>

                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#68745f]">
                    {service.duration_minutes} წთ
                  </p>

                  <p className="text-3xl font-black tracking-normal md:text-right">
                    {formatPrice(service.price)}
                  </p>

                  <button
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`h-11 border px-4 text-[10px] font-black uppercase tracking-[0.22em] transition-colors md:justify-self-end ${
                      isSelected
                        ? "border-[#151716] bg-[#151716] text-white"
                        : "border-[#151716] text-[#151716] hover:bg-[#151716] hover:text-white"
                    }`}
                  >
                    {isSelected ? "არჩეულია" : "არჩევა"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedServices.length > 0 && !bookingOpen ? (
        <div className="fixed bottom-5 right-5 z-[70] w-[calc(100%-2.5rem)] max-w-md border border-[#c9d2c3] bg-white p-4 shadow-[0_18px_60px_rgba(21,23,22,0.18)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#7b8a67]">
                არჩეული სერვისები
              </p>
              <p className="mt-1 text-base font-black">
                {selectedServices.length} სერვისი · {formatDuration(totalDuration)}
              </p>
              <p className="mt-1 text-xs font-bold text-[#586256]">
                {selectedServices.map((service) => service.title).join(", ")}
              </p>
              <p className="mt-1 text-xs font-black text-[#151716]">
                {formatPrice(totalPrice)}
              </p>
            </div>

            <button
              type="button"
              onClick={clearSelection}
              className="text-lg font-black leading-none text-[#586256] hover:text-[#151716]"
              aria-label="არჩეული სერვისების გასუფთავება"
            >
              ×
            </button>
          </div>

            <button
              type="button"
              onClick={() => {
                setSelectedBookingSpecialistId(null);
                setBookingOpen(true);
              }}
            className="mt-4 w-full bg-[#151716] py-3.5 text-[10px] font-black uppercase tracking-[0.28em] text-white transition-colors hover:bg-[#2f3430]"
          >
            დაჯავშნა
          </button>
        </div>
      ) : null}

      {(selectedServices.length > 0 || selectedBookingSpecialistId) && bookingOpen ? (
        <div
          className="fixed inset-0 z-[90] overflow-y-auto bg-[#151716]/62 px-4 py-5 backdrop-blur-sm md:py-8"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto w-full max-w-2xl border border-[#c9d2c3] bg-white shadow-[0_28px_90px_rgba(21,23,22,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#c9d2c3] px-4 py-3 md:px-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#7b8a67]">
                  დაჯავშნა
                </p>
                <h3 className="mt-1 text-lg font-black md:text-xl">
                  აირჩიე ვიზიტის დრო
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBookingOpen(false);
                  setSelectedBookingSpecialistId(null);
                }}
                className="text-2xl font-black leading-none text-[#586256] hover:text-[#151716]"
                aria-label="დაჯავშნის ფანჯრის დახურვა"
              >
                ×
              </button>
            </div>

            <BookingForm
              key={`${selectedBookingSpecialistId || "services"}-${selectedServiceIds.join("|")}`}
              serviceIds={selectedServiceIds}
              preferredSpecialistId={selectedBookingSpecialistId}
              onServiceIdsChange={setSelectedServiceIds}
              onBooked={() => {
                setSelectedServiceIds([]);
                setBookingOpen(false);
                setSelectedBookingSpecialistId(null);
              }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
