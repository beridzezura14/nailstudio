"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AvailableSlot, getAvailableSlots } from "@/lib/scheduling";
import { showToast } from "@/lib/toast";
import { getBookingErrorMessage } from "@/lib/booking-errors";
import {
  SpecialistTimeOff,
  TimeOffBySpecialist,
  WorkingDaysBySpecialist,
  specialistIsTimeOffOnDate,
  specialistWorksOnDate,
} from "@/lib/availability";

const WEEKDAYS = ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"];
const MONTH_NAMES = [
  "იანვარი",
  "თებერვალი",
  "მარტი",
  "აპრილი",
  "მაისი",
  "ივნისი",
  "ივლისი",
  "აგვისტო",
  "სექტემბერი",
  "ოქტომბერი",
  "ნოემბერი",
  "დეკემბერი",
];

interface BookingRange {
  id?: string;
  start_time: string;
  end_time: string;
}

interface Service {
  id: string;
  title: string;
  duration_minutes: number;
}

interface Specialist {
  id: string;
  name: string;
}

interface SpecialistServiceRow {
  specialist_id: string;
  service_id: string;
}

interface SpecialistWorkingDayRow {
  specialist_id: string;
  weekday: number;
}

interface BookingFormProps {
  serviceId?: string | null;
  serviceIds?: string[];
  preferredSpecialistId?: string | null;
  onServiceIdsChange?: (serviceIds: string[]) => void;
  onBooked?: () => void;
}

function formatDateString(date: Date) {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
}

function parseDateString(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}წთ`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}სთ ${rest}წთ` : `${hours}სთ`;
}

export default function BookingForm({
  serviceId = null,
  serviceIds = [],
  preferredSpecialistId = null,
  onServiceIdsChange,
  onBooked,
}: BookingFormProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    serviceIds.length ? serviceIds : serviceId ? [serviceId] : []
  );
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [specialistServiceIds, setSpecialistServiceIds] = useState<
    Record<string, string[]>
  >({});
  const [workingDaysBySpecialist, setWorkingDaysBySpecialist] =
    useState<WorkingDaysBySpecialist>({});
  const [timeOffBySpecialist, setTimeOffBySpecialist] =
    useState<TimeOffBySpecialist>({});
  const [selectedSpecialistId, setSelectedSpecialistId] = useState(
    preferredSpecialistId || ""
  );
  const [dayBookings, setDayBookings] = useState<BookingRange[]>([]);
  const [monthBookings, setMonthBookings] = useState<Record<string, BookingRange[]>>({});
  const [monthBookingsLoaded, setMonthBookingsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(service.id)
  );
  const primaryService = selectedServices[0];
  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + service.duration_minutes,
    0
  );
  const selectedDateSpecialistAvailable = useMemo(() => {
    if (!selectedSpecialistId || !selectedDateStr) return false;

    return specialistWorksOnDate(
      selectedSpecialistId,
      parseDateString(selectedDateStr),
      workingDaysBySpecialist,
      timeOffBySpecialist,
      selectedDateStr
    );
  }, [
    selectedDateStr,
    selectedSpecialistId,
    timeOffBySpecialist,
    workingDaysBySpecialist,
  ]);
  const availableSlots = useMemo(
    () =>
      totalDuration && selectedDateSpecialistAvailable
        ? getAvailableSlots(dayBookings, totalDuration, undefined, selectedDateStr)
        : [],
    [dayBookings, selectedDateSpecialistAvailable, selectedDateStr, totalDuration]
  );
  const eligibleSpecialists = useMemo(
    () =>
      specialists.filter((specialist) => {
        const serviceIdsForSpecialist = specialistServiceIds[specialist.id] || [];
        const isOnVacationToday = specialistIsTimeOffOnDate(
          specialist.id,
          timeOffBySpecialist,
          formatDateString(new Date())
        );

        return (
          !isOnVacationToday &&
          selectedServiceIds.every((id) => serviceIdsForSpecialist.includes(id))
        );
      }),
    [selectedServiceIds, specialistServiceIds, specialists, timeOffBySpecialist]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 2);

  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

  const getMonthRange = useCallback((baseDate: Date) => {
    const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);

    return {
      start: formatDateString(firstDay),
      end: formatDateString(lastDay),
    };
  }, []);

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("services")
      .select("id, title, duration_minutes")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) return;

    setServices(data || []);
    setSelectedServiceIds((current) => {
      const availableIds = new Set((data || []).map((service) => service.id));
      const currentAvailable = current.filter((id) => availableIds.has(id));
      if (currentAvailable.length) return currentAvailable;
      if (serviceIds.length) return serviceIds.filter((id) => availableIds.has(id));
      if (serviceId && availableIds.has(serviceId)) return [serviceId];
      if (preferredSpecialistId) return [];
      return data?.[0]?.id ? [data[0].id] : [];
    });
  }, [preferredSpecialistId, serviceId, serviceIds]);

  const fetchDayBookings = useCallback(async (dateStr: string) => {
    if (!selectedSpecialistId) {
      setDayBookings([]);
      return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("id, start_time, end_time")
      .eq("booking_date", dateStr)
      .eq("specialist_id", selectedSpecialistId)
      .not("status", "in", "(completed,archived)");

    if (error) return;

    setDayBookings(data || []);
  }, [selectedSpecialistId]);

  const fetchMonthBookings = useCallback(
    async (baseDate: Date) => {
      if (!selectedSpecialistId) {
        setMonthBookings({});
        setMonthBookingsLoaded(true);
        return;
      }

      setMonthBookingsLoaded(false);
      const range = getMonthRange(baseDate);
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_date, start_time, end_time")
        .gte("booking_date", range.start)
        .lte("booking_date", range.end)
        .eq("specialist_id", selectedSpecialistId)
        .not("status", "in", "(completed,archived)");

      if (error) {
        setMonthBookings({});
        setMonthBookingsLoaded(true);
        return;
      }

      const groupedBookings = (data || []).reduce<Record<string, BookingRange[]>>(
        (groups, booking) => {
          groups[booking.booking_date] = [
            ...(groups[booking.booking_date] || []),
            {
              id: booking.id,
              start_time: booking.start_time,
              end_time: booking.end_time,
            },
          ];
          return groups;
        },
        {}
      );

      setMonthBookings(groupedBookings);
      setMonthBookingsLoaded(true);
    },
    [getMonthRange, selectedSpecialistId]
  );

  const fetchSpecialists = useCallback(async () => {
    const [specialistsResult, linksResult, workingDaysResult, timeOffResult] =
      await Promise.all([
      supabase
        .from("specialists")
        .select("id, name")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase.from("specialist_services").select("specialist_id, service_id"),
      supabase.from("specialist_working_days").select("specialist_id, weekday"),
      supabase
        .from("specialist_time_off")
        .select("id, specialist_id, start_date, end_date, reason"),
    ]);

    if (specialistsResult.error || linksResult.error) return;

    const links = ((linksResult.data || []) as SpecialistServiceRow[]).reduce<
      Record<string, string[]>
    >((groups, link) => {
      groups[link.specialist_id] = [
        ...(groups[link.specialist_id] || []),
        link.service_id,
      ];
      return groups;
    }, {});

    const workingDays = ((workingDaysResult.data || []) as SpecialistWorkingDayRow[])
      .reduce<WorkingDaysBySpecialist>((groups, row) => {
        groups[row.specialist_id] = [
          ...(groups[row.specialist_id] || []),
          row.weekday,
        ];
        return groups;
      }, {});

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
    setSpecialistServiceIds(links);
    setWorkingDaysBySpecialist(workingDays);
    setTimeOffBySpecialist(timeOff);
  }, []);

  useEffect(() => {
    fetchServices();
    fetchSpecialists();

    const channel = supabase
      .channel("booking-form-services")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        () => {
          fetchServices();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialists" },
        () => {
          fetchSpecialists();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialist_services" },
        () => {
          fetchSpecialists();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialist_working_days" },
        () => {
          fetchSpecialists();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialist_time_off" },
        () => {
          fetchSpecialists();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchServices, fetchSpecialists]);

  useEffect(() => {
    const selectedSpecialistIsAvailable = eligibleSpecialists.some(
      (specialist) => specialist.id === selectedSpecialistId
    );

    if (selectedSpecialistIsAvailable) return;

    setSelectedSpecialistId(eligibleSpecialists[0]?.id || "");
    setSelectedDateStr("");
    setSelectedSlot(null);
    setCurrentStep(1);
  }, [eligibleSpecialists, selectedSpecialistId]);

  useEffect(() => {
    if (!preferredSpecialistId || selectedServiceIds.length || !services.length) {
      return;
    }

    const preferredServiceIds = specialistServiceIds[preferredSpecialistId] || [];
    const firstPreferredService = services.find((service) =>
      preferredServiceIds.includes(service.id)
    );

    if (!firstPreferredService) return;

    setSelectedServiceIds([firstPreferredService.id]);
    onServiceIdsChange?.([firstPreferredService.id]);
  }, [
    onServiceIdsChange,
    preferredSpecialistId,
    selectedServiceIds.length,
    services,
    specialistServiceIds,
  ]);

  useEffect(() => {
    if (!preferredSpecialistId) return;
    if (!eligibleSpecialists.some((specialist) => specialist.id === preferredSpecialistId)) {
      return;
    }

    setSelectedSpecialistId(preferredSpecialistId);
  }, [eligibleSpecialists, preferredSpecialistId]);

  useEffect(() => {
    if (!selectedDateStr) return;

    if (!selectedDateSpecialistAvailable) {
      setSelectedDateStr("");
      setSelectedSlot(null);
      setCurrentStep(1);
      return;
    }

    fetchDayBookings(selectedDateStr);

    const channel = supabase
      .channel(`booking-form-bookings-${selectedDateStr}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchDayBookings(selectedDateStr);
        }
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      fetchDayBookings(selectedDateStr);
    }, 5000);

    const refreshOnFocus = () => {
      fetchDayBookings(selectedDateStr);
    };

    window.addEventListener("focus", refreshOnFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [fetchDayBookings, selectedDateSpecialistAvailable, selectedDateStr]);

  useEffect(() => {
    fetchMonthBookings(currentDate);

    const channel = supabase
      .channel(`booking-form-month-${currentMonthKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchMonthBookings(currentDate);
        }
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      fetchMonthBookings(currentDate);
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(refreshInterval);
    };
  }, [currentDate, currentMonthKey, fetchMonthBookings]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<Date | null> = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handleMonthChange = (direction: "next" | "prev") => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));

    if (
      newDate >= new Date(today.getFullYear(), today.getMonth(), 1) &&
      newDate <= maxDate
    ) {
      setCurrentDate(newDate);
    }
  };

  const toggleService = (id: string) => {
    const exists = selectedServiceIds.includes(id);
    if (exists && selectedServiceIds.length === 1) return;

    const next = exists
      ? selectedServiceIds.filter((item) => item !== id)
      : [...selectedServiceIds, id];

    setSelectedServiceIds(next);
    onServiceIdsChange?.(next);
    setSelectedSpecialistId("");
    setSelectedDateStr("");
    setSelectedSlot(null);
    setCurrentStep(1);
  };

  const handleBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !selectedDateStr ||
      !selectedSlot ||
      !selectedSpecialistId ||
      !primaryService ||
      !clientName ||
      !clientPhone
    ) {
      return;
    }

    const isSelectedSlotAvailable = availableSlots.some(
      (slot) => slot.start === selectedSlot.start && slot.end === selectedSlot.end
    );

    if (!selectedDateSpecialistAvailable) {
      showToast("სპეციალისტი არჩეულ დღეს ხელმისაწვდომი არ არის.", "error");
      setSelectedDateStr("");
      setSelectedSlot(null);
      setCurrentStep(1);
      return;
    }

    if (!isSelectedSlotAvailable) {
      showToast("არჩეული დრო უკვე გასულია ან აღარ არის თავისუფალი. აირჩიე სხვა დრო.", "error");
      setSelectedSlot(null);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          service_id: primaryService.id,
          specialist_id: selectedSpecialistId,
          client_name: clientName,
          client_phone: clientPhone,
          booking_date: selectedDateStr,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
        },
      ])
      .select("id")
      .single();

    if (!error && data?.id) {
      const { error: bookingServicesError } = await supabase.from("booking_services").insert(
        selectedServiceIds.map((id, index) => ({
          booking_id: data.id,
          service_id: id,
          sort_order: index + 1,
        }))
      );

      if (bookingServicesError) {
        setLoading(false);
        showToast(
          "ჯავშანი შეიქმნა, მაგრამ სერვისების სია ვერ შეინახა. გაუშვი Supabase-ში supabase/add_booking_services.sql და სცადე თავიდან.",
          "error"
        );
        return;
      }
    }

    setLoading(false);

    if (error) {
      showToast(getBookingErrorMessage(error.message), "error");
      if (
        error.message.includes("specialist is unavailable on this date") ||
        error.message.includes("specialist is not working on this weekday")
      ) {
        setSelectedDateStr("");
        setSelectedSlot(null);
        setCurrentStep(1);
      }
      return;
    }

    showToast("ჯავშანი წარმატებით დაფიქსირდა!", "success");
    setDayBookings([
      ...dayBookings,
      { start_time: selectedSlot.start, end_time: selectedSlot.end },
    ]);
    setSelectedSlot(null);
    setClientName("");
    setClientPhone("");
    setCurrentStep(1);
    onBooked?.();
  };

  const calendarDays = getDaysInMonth();
  const wizardSteps = [
    { number: 1, label: "დღე" },
    { number: 2, label: "დრო" },
    { number: 3, label: "კონტაქტი" },
  ];

  return (
    <div className="w-full bg-white p-4 md:p-6">
      <div className="mb-5 flex items-center gap-3">
        {wizardSteps.map((step, index) => {
          const isActive = currentStep === step.number;
          const isDone = currentStep > step.number;

          return (
            <div key={step.number} className="flex flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (step.number === 2 && !selectedDateStr) return;
                  if (step.number === 3 && !selectedSlot) return;
                  setCurrentStep(step.number);
                }}
                className={`grid h-9 w-9 shrink-0 place-items-center border text-xs font-black transition-colors ${
                  isActive || isDone
                    ? "border-[#151716] bg-[#151716] text-white"
                    : "border-[#c9d2c3] bg-white text-[#586256]"
                }`}
                aria-label={`ნაბიჯი ${step.number}: ${step.label}`}
              >
                {step.number}
              </button>
              {index < wizardSteps.length - 1 ? (
                <span
                  className={`h-px flex-1 ${
                    currentStep > step.number ? "bg-[#151716]" : "bg-[#c9d2c3]"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mb-5 grid gap-2 border-b border-[#dfe6d8] pb-4 sm:grid-cols-3">
        <div className="bg-[#f7f8f5] px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#7b8a67]">
            სერვისები
          </p>
          <p className="mt-1 text-sm font-black">
            {selectedServices.length || "აირჩიე"} · {formatDuration(totalDuration || 0)}
          </p>
        </div>
        <div className="bg-[#f7f8f5] px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#7b8a67]">
            დღე
          </p>
          <p className="mt-1 text-sm font-black">{selectedDateStr || "აირჩიე"}</p>
        </div>
        <div className="bg-[#f7f8f5] px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#7b8a67]">
            საათი
          </p>
          <p className="mt-1 text-sm font-black">
            {selectedSlot ? `${selectedSlot.start} - ${selectedSlot.end}` : "აირჩიე"}
          </p>
        </div>
      </div>

      <form onSubmit={handleBooking} className="space-y-5 text-[#151716]">
        <section>
          <h4 className="mb-3 text-xs font-black uppercase tracking-[0.18em]">
            მონიშნე სერვისები
          </h4>

          <div className="grid max-h-36 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {services.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={`flex items-center justify-between gap-3 border px-3 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "border-[#151716] bg-[#151716] text-white"
                      : "border-[#dfe6d8] text-[#151716] hover:border-[#151716]"
                  }`}
                >
                  <span className="font-black">{service.title}</span>
                  <span className={isSelected ? "text-white/70" : "text-[#586256]"}>
                    {formatDuration(service.duration_minutes)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-xs font-black uppercase tracking-[0.18em]">
            სპეციალისტი
          </h4>

          {eligibleSpecialists.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {eligibleSpecialists.map((specialist) => {
                const isSelected = selectedSpecialistId === specialist.id;

                return (
                  <button
                    key={specialist.id}
                    type="button"
                    onClick={() => {
                      setSelectedSpecialistId(specialist.id);
                      setSelectedDateStr("");
                      setSelectedSlot(null);
                      setCurrentStep(1);
                    }}
                    className={`border px-3 py-3 text-left text-xs font-black transition-colors ${
                      isSelected
                        ? "border-[#151716] bg-[#151716] text-white"
                        : "border-[#dfe6d8] text-[#151716] hover:border-[#151716]"
                    }`}
                  >
                    {specialist.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="border border-[#dfe6d8] bg-[#f7f8f5] px-3 py-3 text-sm font-semibold text-[#586256]">
              არჩეულ სერვისებზე სპეციალისტი ჯერ არ არის მიბმული.
            </p>
          )}
        </section>

        {currentStep === 1 ? (
          <section>
            <h4 className="mb-3 text-xs font-black uppercase tracking-[0.18em]">
              აირჩიე დღე
            </h4>

            <div className="mb-3 flex items-center justify-between border-b border-[#151716] pb-2">
              <h5 className="text-sm font-black uppercase tracking-[0.08em]">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h5>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleMonthChange("prev")}
                  className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#7b8a67] transition-colors hover:text-[#151716]"
                >
                  წინა
                </button>
                <button
                  type="button"
                  onClick={() => handleMonthChange("next")}
                  className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#7b8a67] transition-colors hover:text-[#151716]"
                >
                  შემდეგი
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-[8px] font-bold tracking-widest text-[#7b8a67]/80">
              {WEEKDAYS.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid w-full grid-cols-7 gap-px border border-[#dfe6d8] bg-[#dfe6d8]">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-10 bg-white sm:h-12" />;
                }

                const dateStr = formatDateString(date);
                const isPast = date < today;
                const isSelected = selectedDateStr === dateStr;
                const specialistIsOnVacation =
                  !!selectedSpecialistId &&
                  specialistIsTimeOffOnDate(
                    selectedSpecialistId,
                    timeOffBySpecialist,
                    dateStr
                  );
                const specialistIsAvailable =
                  !selectedSpecialistId ||
                  specialistWorksOnDate(
                    selectedSpecialistId,
                    date,
                    workingDaysBySpecialist,
                    timeOffBySpecialist,
                    dateStr
                  );
                const dateBookings = monthBookings[dateStr] || [];
                const dayHasAvailableSlot =
                  totalDuration > 0 &&
                  getAvailableSlots(dateBookings, totalDuration, undefined, dateStr).length > 0;
                const isUnavailable =
                  monthBookingsLoaded && totalDuration > 0 && !dayHasAvailableSlot;
                const isDisabled =
                  isPast ||
                  totalDuration === 0 ||
                  !selectedSpecialistId ||
                  !specialistIsAvailable ||
                  isUnavailable;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      setSelectedDateStr(dateStr);
                      setSelectedSlot(null);
                      setCurrentStep(2);
                    }}
                    className={`relative flex h-12 w-full flex-col items-center justify-center gap-0.5 bg-white text-sm font-bold transition-all sm:h-14 ${
                      isDisabled
                        ? "cursor-not-allowed bg-[#f2f5ee] text-[#9aa697]"
                        : "text-[#151716] hover:bg-[#edf3e8]"
                    } ${isSelected ? "!bg-[#151716] text-white" : ""}`}
                    title={
                      !specialistIsAvailable
                        ? specialistIsOnVacation
                          ? "სპეციალისტი ამ დღეს ხელმისაწვდომი არ არის"
                          : "სპეციალისტი ამ დღეს არ მუშაობს"
                        : isUnavailable
                          ? "არჩეული სერვისებისთვის თავისუფალი დრო არ არის"
                          : undefined
                    }
                  >
                    <span className={isDisabled ? "line-through" : ""}>
                      {date.getDate()}
                    </span>
                    {!isDisabled && monthBookingsLoaded ? (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-green-700" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {currentStep === 2 && selectedDateStr ? (
          <section>
            <h4 className="mb-3 text-xs font-black uppercase tracking-[0.18em]">
              აირჩიე საათი · {formatDuration(totalDuration)}
            </h4>

            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3">
              {availableSlots.length === 0 ? (
                <p className="text-sm font-semibold text-[#586256]">
                  ამ დღეს არჩეული სერვისებისთვის თავისუფალი დრო აღარ არის.
                </p>
              ) : (
                availableSlots.map((slot) => {
                  const isSelected = selectedSlot?.start === slot.start;

                  return (
                    <button
                      key={`${slot.start}-${slot.end}`}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(slot);
                        setCurrentStep(3);
                      }}
                      className={`border px-3 py-3 text-center text-[11px] font-bold tracking-widest transition-all ${
                        isSelected
                          ? "border-[#151716] bg-[#151716] text-white"
                          : "border-[#c9d2c3] text-[#151716] hover:border-[#151716]"
                      }`}
                    >
                      {slot.start} - {slot.end}
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-[#586256] hover:text-[#151716]"
            >
              უკან
            </button>
          </section>
        ) : null}

        {currentStep === 3 ? (
          <section>
            <h4 className="mb-3 text-xs font-black uppercase tracking-[0.18em]">
              საკონტაქტო ინფორმაცია
            </h4>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="border-b border-[#c9d2c3] pb-2 transition-colors focus-within:border-[#151716]">
                <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.3em] text-[#7b8a67]">
                  სახელი
                </span>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="მარიამი"
                  className="w-full bg-transparent text-sm font-bold tracking-wide placeholder-[#c9d2c3] focus:outline-none"
                />
              </label>

              <label className="border-b border-[#c9d2c3] pb-2 transition-colors focus-within:border-[#151716]">
                <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.3em] text-[#7b8a67]">
                  ტელეფონი
                </span>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  placeholder="+995 599 XX XX XX"
                  className="w-full bg-transparent text-sm font-bold tracking-widest placeholder-[#c9d2c3] focus:outline-none"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-[#586256] hover:text-[#151716]"
            >
              უკან
            </button>
          </section>
        ) : null}

        {currentStep === 3 ? (
          <button
            type="submit"
            disabled={loading || !selectedSlot || !primaryService}
            className="w-full bg-[#151716] py-3.5 text-[10px] font-bold uppercase tracking-[0.3em] text-white transition-all hover:bg-[#2f3430] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-300"
          >
            {loading ? "იგზავნება..." : "დადასტურება"}
          </button>
        ) : null}
      </form>
    </div>
  );
}
