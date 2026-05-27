"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ServiceAdmin } from "./ServiceAdmin";
import { SpecialistAdmin } from "./SpecialistAdmin";
import {
  BUSINESS_END_MINUTES,
  BUSINESS_START_MINUTES,
  SLOT_STEP_MINUTES,
  AvailableSlot,
  getAvailableGaps,
  getAvailableSlots,
  timeToMinutes,
} from "@/lib/scheduling";
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

const BOOKING_SOURCE_OPTIONS = [
  { value: "phone", label: "ტელეფონი" },
  { value: "instagram", label: "ინსტაგრამი" },
  { value: "facebook", label: "ფეისბუქი" },
  { value: "other", label: "სხვა" },
];

interface Booking {
  id: string;
  client_name: string;
  client_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  service_id: string | null;
  specialist_id?: string | null;
  booking_source?: string | null;
  status?: string | null;
  completed_at?: string | null;
  archived_at?: string | null;
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

interface BookingServiceRow {
  booking_id: string;
  sort_order: number;
  services: Service | null;
}

interface SpecialistWorkingDayRow {
  specialist_id: string;
  weekday: number;
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

function getDaysInMonth(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
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
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} წთ`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}სთ ${rest}წთ` : `${hours}სთ`;
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 15h10l1-15" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function escapeCsvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function getBookingStatusLabel(status?: string | null) {
  if (status === "completed") return "შესრულებული";
  if (status === "archived") return "არქივი";
  if (status === "cancelled") return "გაუქმებული";
  return "აქტიური";
}

function isBookingOverdue(booking: Booking, todayStr: string, currentMinutes: number) {
  if (booking.status === "completed" || booking.status === "archived") return false;
  if (booking.booking_date < todayStr) return true;
  if (booking.booking_date > todayStr) return false;
  return timeToMinutes(booking.end_time) <= currentMinutes;
}

function isBookingCurrent(booking: Booking, todayStr: string, currentMinutes: number) {
  if (booking.status === "completed" || booking.status === "archived") return false;
  if (booking.booking_date !== todayStr) return false;

  return (
    timeToMinutes(booking.start_time) <= currentMinutes &&
    timeToMinutes(booking.end_time) > currentMinutes
  );
}

export function BookingAdmin() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [bookingServicesByBookingId, setBookingServicesByBookingId] = useState<
    Record<string, Service[]>
  >({});
  const [workingDaysBySpecialist, setWorkingDaysBySpecialist] =
    useState<WorkingDaysBySpecialist>({});
  const [timeOffBySpecialist, setTimeOffBySpecialist] =
    useState<TimeOffBySpecialist>({});
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState("");
  const [overviewSpecialistId, setOverviewSpecialistId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [bookingSource, setBookingSource] = useState("phone");
  const [customBookingSource, setCustomBookingSource] = useState("");
  const [formMonthDate, setFormMonthDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [scheduleMonthDate, setScheduleMonthDate] = useState(new Date());
  const [selectedScheduleDateStr, setSelectedScheduleDateStr] = useState(() =>
    formatDateString(new Date())
  );
  const [openBookingMenuId, setOpenBookingMenuId] = useState<string | null>(null);
  const [activeAdminSection, setActiveAdminSection] = useState<
    "booking" | "service" | "specialist"
  >(
    "booking"
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    showToast("ადმინ პანელიდან გამოხვედით.", "success");
    router.replace("/admin/login");
  };

  const today = new Date();
  const now = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateString(today);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 2);

  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(service.id)
  );
  const selectedService = selectedServices[0];
  const selectedDuration = selectedServices.reduce(
    (sum, service) => sum + service.duration_minutes,
    0
  );
  const activeBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.status !== "completed" && booking.status !== "archived"
      ),
    [bookings]
  );

  const fetchBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return data ?? [];
  }, []);

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("services")
      .select("id, title, duration_minutes")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return data ?? [];
  }, []);

  const fetchSpecialists = useCallback(async () => {
    const { data, error } = await supabase
      .from("specialists")
      .select("id, name")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return data ?? [];
  }, []);

  const fetchBookingServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("booking_services")
      .select("booking_id, sort_order, services(id, title, duration_minutes)")
      .order("sort_order", { ascending: true });

    if (error) {
      return {};
    }

    return ((data || []) as unknown as BookingServiceRow[]).reduce<
      Record<string, Service[]>
    >((groups, row) => {
      if (!row.services) return groups;
      groups[row.booking_id] = [...(groups[row.booking_id] || []), row.services];
      return groups;
    }, {});
  }, []);

  const fetchSpecialistAvailability = useCallback(async () => {
    const [workingDaysResult, timeOffResult] = await Promise.all([
      supabase.from("specialist_working_days").select("specialist_id, weekday"),
      supabase
        .from("specialist_time_off")
        .select("id, specialist_id, start_date, end_date, reason"),
    ]);

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

    return { workingDays, timeOff };
  }, []);

  const refreshBookings = useCallback(async () => {
    const [bookingData, bookingServiceData] = await Promise.all([
      fetchBookings(),
      fetchBookingServices(),
    ]);
    setBookings(bookingData);
    setBookingServicesByBookingId(bookingServiceData);
  }, [fetchBookings, fetchBookingServices]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchBookings(),
      fetchServices(),
      fetchSpecialists(),
      fetchBookingServices(),
      fetchSpecialistAvailability(),
    ]).then(
      ([
        bookingData,
        serviceData,
        specialistData,
        bookingServiceData,
        availabilityData,
      ]) => {
        if (!isMounted) return;
        setBookings(bookingData);
        setServices(serviceData);
        setSpecialists(specialistData);
        setBookingServicesByBookingId(bookingServiceData);
        setWorkingDaysBySpecialist(availabilityData.workingDays);
        setTimeOffBySpecialist(availabilityData.timeOff);
        setSelectedServiceIds((current) =>
          current.length ? current : serviceData[0]?.id ? [serviceData[0].id] : []
        );
        setSelectedSpecialistId((current) =>
          current ? current : specialistData[0]?.id || ""
        );
      }
    );

    const bookingChannel = supabase
      .channel("admin-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          refreshBookings();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking_services" },
        () => {
          refreshBookings();
        }
      )
      .subscribe();

    const servicesChannel = supabase
      .channel("admin-services")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        async () => {
          const serviceData = await fetchServices();
          setServices(serviceData);
          refreshBookings();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialists" },
        async () => {
          const specialistData = await fetchSpecialists();
          setSpecialists(specialistData);
          setSelectedSpecialistId((current) =>
            current ? current : specialistData[0]?.id || ""
          );
          refreshBookings();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialist_services" },
        async () => {
          const specialistData = await fetchSpecialists();
          setSpecialists(specialistData);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialist_working_days" },
        async () => {
          const availabilityData = await fetchSpecialistAvailability();
          setWorkingDaysBySpecialist(availabilityData.workingDays);
          setTimeOffBySpecialist(availabilityData.timeOff);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialist_time_off" },
        async () => {
          const availabilityData = await fetchSpecialistAvailability();
          setWorkingDaysBySpecialist(availabilityData.workingDays);
          setTimeOffBySpecialist(availabilityData.timeOff);
        }
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      refreshBookings();
    }, 5000);

    const refreshOnFocus = () => {
      refreshBookings();
    };

    window.addEventListener("focus", refreshOnFocus);

    return () => {
      isMounted = false;
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(servicesChannel);
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [
    fetchBookings,
    fetchServices,
    fetchSpecialists,
    fetchBookingServices,
    fetchSpecialistAvailability,
    refreshBookings,
  ]);

  useEffect(() => {
    const refreshServices = async () => {
      const serviceData = await fetchServices();
      setServices(serviceData);
      setSelectedServiceIds((current) => current.length ? current : serviceData[0]?.id ? [serviceData[0].id] : []);
    };

    window.addEventListener("services-updated", refreshServices);
    return () => window.removeEventListener("services-updated", refreshServices);
  }, [fetchServices]);

  const bookingsByDate = useMemo(
    () =>
      activeBookings
        .filter(
          (booking) => !overviewSpecialistId || booking.specialist_id === overviewSpecialistId
        )
        .reduce<Record<string, Booking[]>>((groups, booking) => {
          groups[booking.booking_date] = [...(groups[booking.booking_date] || []), booking];
          return groups;
        }, {}),
    [activeBookings, overviewSpecialistId]
  );

  const formBookingsByDate = useMemo(
    () =>
      activeBookings
        .filter(
          (booking) => !selectedSpecialistId || booking.specialist_id === selectedSpecialistId
        )
        .reduce<Record<string, Booking[]>>((groups, booking) => {
          groups[booking.booking_date] = [...(groups[booking.booking_date] || []), booking];
          return groups;
        }, {}),
    [activeBookings, selectedSpecialistId]
  );

  const selectedDateBookings = formBookingsByDate[selectedDateStr] || [];
  const selectedDateSpecialistAvailable =
    !!selectedSpecialistId &&
    !!selectedDateStr &&
    specialistWorksOnDate(
      selectedSpecialistId,
      parseDateString(selectedDateStr),
      workingDaysBySpecialist,
      timeOffBySpecialist,
      selectedDateStr
    );
  const selectedDayBookings = bookingsByDate[selectedScheduleDateStr] || [];
  const selectedDayOverdueBookings = selectedDayBookings.filter((booking) =>
    isBookingOverdue(booking, todayStr, currentMinutes)
  );
  const selectedDayCompletedBookings = bookings.filter(
    (booking) =>
      booking.booking_date === selectedScheduleDateStr &&
      (!overviewSpecialistId || booking.specialist_id === overviewSpecialistId) &&
      (booking.status === "completed" || booking.status === "archived")
  );
  const selectedScheduleSpecialistAvailable =
    !!overviewSpecialistId &&
    specialistWorksOnDate(
      overviewSpecialistId,
      parseDateString(selectedScheduleDateStr),
      workingDaysBySpecialist,
      timeOffBySpecialist,
      selectedScheduleDateStr
    );
  const availableFormSlots =
    selectedDateStr && selectedDuration && selectedDateSpecialistAvailable
      ? getAvailableSlots(
          selectedDateBookings,
          selectedDuration,
          editingBooking?.id,
          selectedDateStr
        )
      : [];
  const selectedDayFreeSlots =
    selectedDuration && overviewSpecialistId && selectedScheduleSpecialistAvailable
    ? getAvailableSlots(
        selectedDayBookings,
        selectedDuration,
        undefined,
        selectedScheduleDateStr
      )
    : [];
  const selectedDayFreeGaps = overviewSpecialistId && selectedScheduleSpecialistAvailable
    ? getAvailableGaps(selectedDayBookings, undefined, selectedScheduleDateStr)
    : [];
  const selectedDayWorkdayIsOver =
    selectedScheduleDateStr === todayStr && currentMinutes >= BUSINESS_END_MINUTES;
  const todayBookingsCount = bookingsByDate[todayStr]?.length || 0;
  const upcomingBookingsCount = bookings.filter(
    (booking) =>
      (!overviewSpecialistId || booking.specialist_id === overviewSpecialistId) &&
      booking.booking_date >= todayStr &&
      booking.status !== "completed" &&
      booking.status !== "archived"
  ).length;

  const handleMonthChange = (direction: "next" | "prev") => {
    const newDate = new Date(formMonthDate);
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));

    if (
      newDate >= new Date(today.getFullYear(), today.getMonth(), 1) &&
      newDate <= maxDate
    ) {
      setFormMonthDate(newDate);
    }
  };

  const handleScheduleMonthChange = (direction: "next" | "prev") => {
    const newDate = new Date(scheduleMonthDate);
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    setScheduleMonthDate(newDate);
  };

  const resetForm = () => {
    setEditingBooking(null);
    setClientName("");
    setClientPhone("");
    setBookingSource("phone");
    setCustomBookingSource("");
    setSelectedDateStr("");
    setSelectedSlot(null);
  };

  const toggleService = (id: string) => {
    setSelectedServiceIds((current) => {
      const exists = current.includes(id);
      if (exists && current.length === 1) return current;
      return exists ? current.filter((item) => item !== id) : [...current, id];
    });
    setSelectedSlot(null);
  };

  const selectOnlyService = (id: string) => {
    setSelectedServiceIds([id]);
    setSelectedSlot(null);
  };

  const handleAdminSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !selectedDateStr ||
      !selectedSlot ||
      !clientName ||
      !clientPhone ||
      !selectedService ||
      !selectedSpecialistId
    ) {
      return;
    }

    const sourceLabel =
      bookingSource === "other"
        ? customBookingSource.trim()
        : BOOKING_SOURCE_OPTIONS.find((source) => source.value === bookingSource)?.label;
    const normalizedSource = sourceLabel || "ტელეფონი";

    setLoading(true);

    const isSelectedSlotAvailable = availableFormSlots.some(
      (slot) => slot.start === selectedSlot.start && slot.end === selectedSlot.end
    );

    if (!isSelectedSlotAvailable) {
      setLoading(false);
      showToast("არჩეული დრო უკვე გასულია ან აღარ არის თავისუფალი. აირჩიე სხვა დრო.", "error");
      setSelectedSlot(null);
      return;
    }

    const payload = {
      service_id: selectedService.id,
      specialist_id: selectedSpecialistId,
      client_name: clientName.toUpperCase().startsWith("[OFFLINE]")
        ? clientName.toUpperCase()
        : `[OFFLINE] ${clientName.toUpperCase()}`,
      client_phone: clientPhone,
      booking_source: normalizedSource,
      booking_date: selectedDateStr,
      start_time: selectedSlot.start,
      end_time: selectedSlot.end,
    };

    const { data, error } = editingBooking
      ? await supabase
          .from("bookings")
          .update(payload)
          .eq("id", editingBooking.id)
          .select("id")
          .single()
      : await supabase.from("bookings").insert([payload]).select("id").single();

    const bookingId = editingBooking?.id || data?.id;
    if (!error && bookingId) {
      const { error: deleteServicesError } = await supabase
        .from("booking_services")
        .delete()
        .eq("booking_id", bookingId);

      if (deleteServicesError) {
        setLoading(false);
        showToast(
          "ჯავშანი შეინახა, მაგრამ სერვისებთან კავშირი ვერ განახლდა. გაუშვი Supabase-ში supabase/add_booking_services.sql.",
          "error"
        );
        return;
      }

      const { error: insertServicesError } = await supabase.from("booking_services").insert(
        selectedServiceIds.map((id, index) => ({
          booking_id: bookingId,
          service_id: id,
          sort_order: index + 1,
        }))
      );

      if (insertServicesError) {
        setLoading(false);
        showToast(
          "ჯავშანი შეინახა, მაგრამ არჩეული სერვისები ვერ შეინახა. გაუშვი Supabase-ში supabase/add_booking_services.sql.",
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
        setSelectedSlot(null);
      }
      return;
    }

    showToast(editingBooking ? "ჯავშანი განახლდა." : "ჯავშანი დაემატა.", "success");
    setSelectedScheduleDateStr(selectedDateStr);
    setScheduleMonthDate(new Date(selectedDateStr));
    resetForm();
    await refreshBookings();
  };

  const startEdit = (booking: Booking) => {
    const bookingDate = new Date(booking.booking_date);
    const matchedSource = BOOKING_SOURCE_OPTIONS.find(
      (source) => source.label === booking.booking_source
    );
    const bookingServices = bookingServicesByBookingId[booking.id] || [];

    setEditingBooking(booking);
    setClientName(booking.client_name);
    setClientPhone(booking.client_phone);
    setSelectedServiceIds(
      bookingServices.length
        ? bookingServices.map((service) => service.id)
        : booking.service_id
          ? [booking.service_id]
          : services[0]?.id
            ? [services[0].id]
            : []
    );
    setSelectedSpecialistId(booking.specialist_id || specialists[0]?.id || "");
    setBookingSource(matchedSource?.value || (booking.booking_source ? "other" : "phone"));
    setCustomBookingSource(matchedSource ? "" : booking.booking_source || "");
    setSelectedDateStr(booking.booking_date);
    setSelectedSlot({
      start: booking.start_time.substring(0, 5),
      end: booking.end_time.substring(0, 5),
    });
    setFormMonthDate(bookingDate);
    setSelectedScheduleDateStr(booking.booking_date);
    setScheduleMonthDate(bookingDate);
    setOpenBookingMenuId(null);
  };

  const handleComplete = async (id: string) => {
    if (!confirm("მოვნიშნო ეს ჯავშანი შესრულებულად?")) return;
    setOpenBookingMenuId(null);

    const completedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        completed_at: completedAt,
        archived_at: completedAt,
      })
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      showToast(
        "შეცდომა: " +
          error.message +
          ". გაუშვი Supabase SQL Editor-ში supabase/add_booking_archive_status.sql.",
        "error"
      );
      return;
    }

    if (!data?.id) {
      showToast("ჯავშნის არქივში გადატანა ვერ მოხერხდა.", "error");
      return;
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === id
          ? {
              ...booking,
              status: "completed",
              completed_at: completedAt,
              archived_at: completedAt,
            }
          : booking
      )
    );
    if (editingBooking?.id === id) resetForm();
    await refreshBookings();
    showToast("ჯავშანი შესრულებულად მოინიშნა.", "success");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("წავშალო ეს ჯავშანი?")) return;
    setOpenBookingMenuId(null);

    const { data, error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      showToast("შეცდომა: " + error.message, "error");
      return;
    }

    if (!data?.length) {
      showToast(
        "ჯავშანი ვერ წაიშალა. გაუშვი Supabase SQL Editor-ში supabase/allow_booking_cancel.sql.",
        "error"
      );
      return;
    }

    setBookings(bookings.filter((booking) => booking.id !== id));
    setBookingServicesByBookingId(({ [id]: _deleted, ...rest }) => rest);
    if (editingBooking?.id === id) resetForm();
    showToast("ჯავშანი წაიშალა.", "success");
  };

  const exportBookingsToCsv = () => {
    if (!bookings.length) {
      showToast("ექსპორტისთვის ჯავშნები არ არის.", "info");
      return;
    }

    const sortedBookings = [...bookings].sort((first, second) =>
      `${first.booking_date} ${first.start_time}`.localeCompare(
        `${second.booking_date} ${second.start_time}`
      )
    );

    const header = [
      "თარიღი",
      "დაწყება",
      "დასრულება",
      "კლიენტი",
      "ტელეფონი",
      "სპეციალისტი",
      "სერვისები",
      "ჯამური ხანგრძლივობა",
      "წყარო",
      "სტატუსი",
      "შესრულების დრო",
      "არქივის დრო",
    ];

    const rows = sortedBookings.map((booking) => {
      const linkedServices = bookingServicesByBookingId[booking.id] || [];
      const fallbackService = services.find(
        (service) => service.id === booking.service_id
      );
      const bookingServices = linkedServices.length
        ? linkedServices
        : fallbackService
          ? [fallbackService]
          : [];
      const totalDuration = bookingServices.reduce(
        (sum, service) => sum + service.duration_minutes,
        0
      );
      const specialistName =
        specialists.find((specialist) => specialist.id === booking.specialist_id)
          ?.name || "სპეციალისტი არ არის";

      return [
        booking.booking_date,
        booking.start_time.substring(0, 5),
        booking.end_time.substring(0, 5),
        booking.client_name,
        booking.client_phone,
        specialistName,
        bookingServices.map((service) => service.title).join(", ") ||
          "სერვისი არ არის არჩეული",
        totalDuration ? formatDuration(totalDuration) : "",
        booking.booking_source || "არ არის",
        getBookingStatusLabel(booking.status),
        booking.completed_at || "",
        booking.archived_at || "",
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\r\n");
    const blob = new Blob(["\ufeff", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `bookings-${formatDateString(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("CSV ფაილი ჩამოიტვირთა.", "success");
  };

  const formCalendarDays = getDaysInMonth(formMonthDate);
  const scheduleCalendarDays = getDaysInMonth(scheduleMonthDate);
  const totalBusinessMinutes = BUSINESS_END_MINUTES - BUSINESS_START_MINUTES;

  const adminSections = [
    { id: "booking" as const, label: "ჯავშნები" },
    { id: "service" as const, label: "სერვისები" },
    { id: "specialist" as const, label: "სპეციალისტები" },
  ];

  return (
    <main className="min-h-screen w-full bg-[#eef2ea] text-[#151716]">
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 border-b border-[#c9d2c3] bg-white/95 px-3 py-3 shadow-[0_10px_35px_rgba(21,23,22,0.04)] backdrop-blur md:px-5 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#7b8a67] sm:text-[10px] sm:tracking-[0.32em]">
                  ფრჩხილის სტუდია
                </p>
                <h1 className="mt-0.5 text-lg font-black uppercase tracking-normal sm:text-2xl">
                  ადმინი
                </h1>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center xl:min-w-[640px]">
              <nav className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {adminSections.map((section) => {
                  const isActive = activeAdminSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveAdminSection(section.id)}
                      className={`min-h-10 border px-2 py-2 text-center text-[10px] font-black uppercase tracking-normal transition-colors sm:px-4 sm:text-xs sm:tracking-[0.14em] ${
                        isActive
                          ? "border-[#151716] bg-[#151716] text-white"
                          : "border-[#dfe6d8] text-[#586256] hover:border-[#151716] hover:text-[#151716]"
                      }`}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </nav>

              <a
                href="/"
                className="border border-[#dfe6d8] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[#586256] transition-colors hover:border-[#151716] hover:text-[#151716] sm:whitespace-nowrap"
              >
                მთავარი
              </a>

              <button
                type="button"
                onClick={handleSignOut}
                className="border border-[#dfe6d8] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[#586256] transition-colors hover:border-[#151716] hover:text-[#151716] sm:whitespace-nowrap"
              >
                გამოსვლა
              </button>
            </div>

          </div>
        </header>

        <div className="mx-auto min-w-0 max-w-[1600px] p-3 sm:p-5 md:p-6 lg:p-8">
          <div className="mb-5 flex flex-col gap-3 border-b border-[#c9d2c3] pb-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-[#7b8a67]">
                მართვა
              </p>
              <h2 className="text-3xl font-black uppercase tracking-normal md:text-5xl">
                {activeAdminSection === "booking"
                  ? "ჯავშნები"
                  : activeAdminSection === "service"
                    ? "სერვისები"
                    : "სპეციალისტები"}
              </h2>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <p className="text-xs font-bold tracking-widest text-[#7b8a67]">
                სულ: {activeBookings.length} აქტიური
              </p>
              {activeAdminSection === "booking" ? (
                <button
                  type="button"
                  onClick={exportBookingsToCsv}
                  className="border border-[#151716] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#151716] transition-colors hover:bg-[#151716] hover:text-white"
                >
                  Excel-ში გადმოწერა
                </button>
              ) : null}
            </div>
          </div>

          <div className={activeAdminSection === "service" ? "block" : "hidden"}>
            <ServiceAdmin />
          </div>

          <div className={activeAdminSection === "specialist" ? "block" : "hidden"}>
            <SpecialistAdmin />
          </div>

          <div className={activeAdminSection === "booking" ? "block" : "hidden"}>
      <div className="flex w-full flex-col items-start gap-5 2xl:flex-row 2xl:gap-8">
        <div className="w-full shrink-0 border border-[#c9d2c3] bg-white p-4 shadow-[0_15px_40px_rgba(21,23,22,0.02)] sm:p-6 2xl:w-[420px]">
          <div className="mb-6">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.3em] text-[#7b8a67]">
              {editingBooking ? "ცვლილება" : "ხელით დამატება"}
            </p>
            <h2 className="text-xl font-black uppercase tracking-normal">
              {editingBooking ? "ჯავშნის რედაქტირება" : "ჯავშნის ხელით დამატება"}
            </h2>
          </div>

          <form onSubmit={handleAdminSubmit} className="space-y-5">
            <div>
              <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                სერვისები
              </span>
              <div className="grid max-h-44 gap-2 overflow-y-auto pr-1">
                {services.map((service) => {
                  const isSelected = selectedServiceIds.includes(service.id);

                  return (
                    <div key={service.id} className="grid grid-cols-[1fr_auto] gap-2">
                      <button
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
                      <button
                        type="button"
                        onClick={() => selectOnlyService(service.id)}
                        className="border border-[#dfe6d8] px-3 text-[9px] font-black uppercase tracking-[0.16em] text-[#586256] transition-colors hover:border-[#151716] hover:text-[#151716]"
                      >
                        მხოლოდ
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] font-bold text-[#586256]">
                ჯამური ხანგრძლივობა: {formatDuration(selectedDuration || SLOT_STEP_MINUTES)}
              </p>
            </div>

            <label className="block border-b border-[#c9d2c3] pb-1.5 focus-within:border-[#151716]">
              <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                სპეციალისტი
              </span>
              <select
                required
                value={selectedSpecialistId}
                onChange={(event) => {
                  setSelectedSpecialistId(event.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full bg-transparent text-sm font-bold text-[#151716] focus:outline-none"
              >
                <option value="">აირჩიე სპეციალისტი</option>
                {specialists.map((specialist) => (
                  <option key={specialist.id} value={specialist.id}>
                    {specialist.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="border-b border-[#c9d2c3] pb-1.5 focus-within:border-[#151716]">
                <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                  კლიენტის სახელი
                </span>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="NINO K."
                  className="w-full bg-transparent text-sm font-bold uppercase placeholder-[#c9d2c3]/50 focus:outline-none"
                />
              </label>

              <label className="border-b border-[#c9d2c3] pb-1.5 focus-within:border-[#151716]">
                <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                  ტელეფონი
                </span>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  placeholder="599 XXXXXX"
                  className="w-full bg-transparent text-sm font-bold tracking-wider placeholder-[#c9d2c3]/50 focus:outline-none"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="border-b border-[#c9d2c3] pb-1.5 focus-within:border-[#151716]">
                <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                  ჯავშნის წყარო
                </span>
                <select
                  value={bookingSource}
                  onChange={(event) => setBookingSource(event.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-[#151716] focus:outline-none"
                >
                  {BOOKING_SOURCE_OPTIONS.map((source) => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </label>

              {bookingSource === "other" && (
                <label className="border-b border-[#c9d2c3] pb-1.5 focus-within:border-[#151716]">
                  <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                    სხვა წყარო
                  </span>
                  <input
                    type="text"
                    required
                    value={customBookingSource}
                    onChange={(event) => setCustomBookingSource(event.target.value)}
                    placeholder="WhatsApp"
                    className="w-full bg-transparent text-sm font-bold uppercase tracking-wide placeholder-[#c9d2c3]/50 focus:outline-none"
                  />
                </label>
              )}
            </div>

            <div className="border-t border-[#c9d2c3]/30 pt-2">
              <div className="mb-4 flex items-center justify-between border-b border-[#c9d2c3]/60 pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#151716]">
                  {MONTH_NAMES[formMonthDate.getMonth()]}
                </h3>
                <div className="flex space-x-3 text-[9px] font-bold uppercase tracking-[0.1em] text-[#7b8a67]">
                  <button type="button" onClick={() => handleMonthChange("prev")}>
                    წინა
                  </button>
                  <button type="button" onClick={() => handleMonthChange("next")}>
                    შემდეგი
                  </button>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-7 text-center text-[8px] font-bold uppercase tracking-wider text-[#7b8a67]/60">
                {WEEKDAYS.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1 text-center">
                {formCalendarDays.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className="h-6 w-6" />;

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
                  const isDisabled = isPast || !specialistIsAvailable;

                  return (
                    <div key={dateStr} className="flex items-center justify-center">
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          setSelectedDateStr(dateStr);
                          setSelectedSlot(null);
                        }}
                        className={`flex h-9 w-9 flex-col items-center justify-center rounded-full text-[11px] font-bold leading-none transition-all ${
                          isDisabled
                            ? "cursor-not-allowed bg-[#f2f5ee] text-[#9aa697]"
                            : "text-[#151716] hover:bg-[#151716] hover:text-white"
                        } ${isSelected ? "bg-[#151716] text-white" : ""}`}
                        title={
                          !specialistIsAvailable
                            ? specialistIsOnVacation
                              ? "სპეციალისტი ამ დღეს ხელმისაწვდომი არ არის"
                              : "სპეციალისტი ამ დღეს არ მუშაობს"
                            : undefined
                        }
                      >
                        <span className={isDisabled ? "line-through" : ""}>
                          {date.getDate()}
                        </span>
                        {!isPast && selectedSpecialistId && !specialistIsAvailable ? (
                          <span className="mt-0.5 text-[6px] font-black uppercase leading-none text-[#7b8a67]">
                            არ
                          </span>
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDateStr && (
              <div className="space-y-1.5 border-t border-[#c9d2c3]/40 pt-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#7b8a67]">
                  თავისუფალი დროები ({formatDuration(selectedDuration || SLOT_STEP_MINUTES)})
                </p>
                <div className="max-h-[180px] space-y-1 overflow-y-auto pr-1">
                  {availableFormSlots.length === 0 ? (
                    <p className="py-3 text-sm font-semibold text-[#586256]">
                      {!selectedDateSpecialistAvailable
                        ? "სპეციალისტი ამ დღეს ხელმისაწვდომი არ არის."
                        : "ამ დღეს არჩეული სერვისი აღარ ეტევა."}
                    </p>
                  ) : (
                    availableFormSlots.map((slot) => {
                      const isSelected = selectedSlot?.start === slot.start;

                      return (
                        <button
                          key={`${slot.start}-${slot.end}`}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`flex w-full items-center justify-between border-b border-[#c9d2c3]/30 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all hover:bg-[#151716]/5 ${
                            isSelected ? "bg-[#151716]/5 font-black text-[#151716]" : ""
                          }`}
                        >
                          <span>
                            {slot.start} - {slot.end}
                          </span>
                          <span className="text-[8px] font-normal tracking-normal opacity-50">
                            {isSelected ? "არჩეულია" : "თავისუფალია"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading || !selectedSlot || !selectedService}
                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white transition-colors disabled:bg-[#c9d2c3]/50 ${
                  editingBooking
                    ? "flex-1 bg-[#151716] hover:bg-[#2f3430]"
                    : "w-full bg-[#151716] hover:bg-[#2f3430]"
                }`}
              >
                {loading ? "მუშავდება..." : editingBooking ? "განახლება" : "ჯავშნის შენახვა"}
              </button>

              {editingBooking && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="border border-[#151716] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#151716] transition-colors hover:bg-gray-100"
                >
                  გაუქმება
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="w-full min-w-0 flex-1 space-y-5">
            <section className="border border-[#dfe6d8] bg-white p-3 shadow-[0_12px_35px_rgba(21,23,22,0.035)] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#7b8a67]">
                  კალენდარი
                </p>
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">ჯავშნების მიმოხილვა</h2>
              </div>

              <div className="grid gap-2 sm:grid-cols-[220px_auto_auto] sm:gap-3">
                <label className="bg-[#f2f5ee] px-3 py-2 sm:px-4 sm:py-3">
                  <span className="text-[10px] font-bold text-[#7b8a67]">
                    სპეციალისტი
                  </span>
                  <select
                    value={overviewSpecialistId}
                    onChange={(event) => {
                      const nextSpecialistId = event.target.value;
                      setOverviewSpecialistId(nextSpecialistId);
                      if (nextSpecialistId) {
                        setSelectedSpecialistId(nextSpecialistId);
                        setSelectedSlot(null);
                      }
                    }}
                    className="mt-1 w-full bg-transparent text-sm font-black text-[#151716] focus:outline-none"
                  >
                    <option value="">ყველა სპეციალისტი</option>
                    {specialists.map((specialist) => (
                      <option key={specialist.id} value={specialist.id}>
                        {specialist.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="bg-[#f2f5ee] px-3 py-2 sm:px-4 sm:py-3">
                  <p className="text-[10px] font-bold text-[#7b8a67]">დღეს</p>
                  <p className="mt-1 text-xl font-black sm:text-2xl">{todayBookingsCount}</p>
                </div>
                <div className="bg-[#f2f5ee] px-3 py-2 sm:px-4 sm:py-3">
                  <p className="text-[10px] font-bold text-[#7b8a67]">მომავალი</p>
                  <p className="mt-1 text-xl font-black sm:text-2xl">{upcomingBookingsCount}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-b border-[#c9d2c3] pb-3 sm:mt-6">
              <h3 className="text-sm font-black uppercase tracking-wide sm:text-lg">
                {MONTH_NAMES[scheduleMonthDate.getMonth()]} {scheduleMonthDate.getFullYear()}
              </h3>
              <div className="flex shrink-0 gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7b8a67] sm:tracking-[0.18em]">
                <button type="button" onClick={() => handleScheduleMonthChange("prev")}>
                  წინა
                </button>
                <button type="button" onClick={() => handleScheduleMonthChange("next")}>
                  შემდეგი
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-7 text-center text-[8px] font-bold uppercase tracking-normal text-[#7b8a67]/70 sm:mt-4 sm:text-[9px] sm:tracking-wider">
              {WEEKDAYS.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-px border border-[#dfe6d8] bg-[#dfe6d8] sm:mt-3">
              {scheduleCalendarDays.map((date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`schedule-empty-${index}`}
                      className="min-h-14 bg-white sm:min-h-20"
                    />
                  );
                }

                const dateStr = formatDateString(date);
                const dayBookings = bookingsByDate[dateStr] || [];
                const bookedMinutes = dayBookings.reduce(
                  (sum, booking) =>
                    sum + (timeToMinutes(booking.end_time) - timeToMinutes(booking.start_time)),
                  0
                );
                const bookedPercent = Math.min((bookedMinutes / totalBusinessMinutes) * 100, 100);
                const isSelected = selectedScheduleDateStr === dateStr;
                const isToday = dateStr === todayStr;
                const isFull = bookedMinutes >= totalBusinessMinutes;
                const scheduleSpecialistAvailable =
                  !overviewSpecialistId ||
                  specialistWorksOnDate(
                    overviewSpecialistId,
                    date,
                    workingDaysBySpecialist,
                    timeOffBySpecialist,
                    dateStr
                  );

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedScheduleDateStr(dateStr)}
                    title={
                      !scheduleSpecialistAvailable
                        ? "სპეციალისტი ამ დღეს არ მუშაობს"
                        : undefined
                    }
                    className={`min-h-14 bg-white p-1.5 text-left transition-colors hover:bg-[#f2f5ee] sm:min-h-20 sm:p-2 ${
                      isSelected ? "ring-2 ring-inset ring-[#151716]" : ""
                    } ${!scheduleSpecialistAvailable ? "bg-[#f2f5ee] text-[#9aa697]" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs font-black sm:text-sm ${isToday ? "text-[#7b8a67]" : ""}`}>
                        {date.getDate()}
                      </span>
                      {bookedMinutes > 0 && (
                        <span
                          className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${
                            isFull ? "bg-red-500" : "bg-amber-500"
                          }`}
                        />
                      )}
                    </div>
                    <p className="mt-1 hidden text-[10px] font-bold text-[#586256] sm:mt-3 sm:block">
                      {scheduleSpecialistAvailable
                        ? `${formatDuration(bookedMinutes)} დაკავებულია`
                        : "არ მუშაობს"}
                    </p>
                    <div className="mt-2 h-1 bg-[#dfe7d8] sm:h-1.5">
                      <div
                        className={`h-full ${isFull ? "bg-red-500" : "bg-[#7b8a67]"}`}
                        style={{ width: `${bookedPercent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="border border-[#dfe6d8] bg-white p-5">
              <div className="mb-4 flex items-center justify-between border-b border-[#dfe6d8] pb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7b8a67]">
                    არჩეული დღე
                  </p>
                  <h3 className="mt-1 text-xl font-black">{selectedScheduleDateStr}</h3>
                </div>
                <p className="text-sm font-bold text-[#586256]">
                  {selectedDayBookings.length} აქტიური
                  {selectedDayOverdueBookings.length
                    ? ` / ${selectedDayOverdueBookings.length} ვადაგასული`
                    : ""}
                  {selectedDayCompletedBookings.length
                    ? ` / ${selectedDayCompletedBookings.length} შესრულებული`
                    : ""}
                </p>
              </div>

              <div className="space-y-2">
                {selectedDayBookings.length === 0 ? (
                  <p className="border border-[#d9ead0] bg-[#f2f8ed] p-3 text-sm font-semibold text-green-800">
                    ამ დღეს ჯავშნები არ არის.
                  </p>
                ) : (
                  selectedDayBookings.map((booking) => {
                    const linkedServices = bookingServicesByBookingId[booking.id] || [];
                    const fallbackService = services.find(
                      (service) => service.id === booking.service_id
                    );
                    const bookingServices = linkedServices.length
                      ? linkedServices
                      : fallbackService
                        ? [fallbackService]
                        : [];
                    const isOverdue = isBookingOverdue(
                      booking,
                      todayStr,
                      currentMinutes
                    );
                    const isCurrent = isBookingCurrent(
                      booking,
                      todayStr,
                      currentMinutes
                    );

                    return (
                      <div
                        key={booking.id}
                        className={`border p-3 ${
                          isCurrent
                            ? "border-green-200 bg-green-50"
                            : isOverdue
                            ? "border-red-200 bg-red-50"
                            : "border-[#c9d2c3] bg-[#f7f8f5]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1 text-xs font-semibold text-[#586256]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-[#151716]">
                                {booking.start_time.substring(0, 5)} -{" "}
                                {booking.end_time.substring(0, 5)}
                              </span>
                              {isOverdue ? (
                                <span className="bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                                  ვადაგასული
                                </span>
                              ) : null}
                              {isCurrent ? (
                                <span className="bg-green-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                                  მიმდინარე
                                </span>
                              ) : null}
                            </div>
                            <span>{booking.client_name}</span>
                            <span>{booking.client_phone}</span>
                            <span>
                              {specialists.find(
                                (specialist) => specialist.id === booking.specialist_id
                              )?.name || "სპეციალისტი არ არის"}
                            </span>
                            <span>{booking.booking_source || "არ არის"}</span>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {bookingServices.length ? (
                                bookingServices.map((service) => (
                                  <span
                                    key={`${booking.id}-${service.id}`}
                                    className="border border-[#c9d2c3] bg-white px-2 py-1 text-[10px] font-black text-[#151716]"
                                  >
                                    {service.title} · {formatDuration(service.duration_minutes)}
                                  </span>
                                ))
                              ) : (
                                <span className="border border-[#c9d2c3] bg-white px-2 py-1 text-[10px] font-black text-[#586256]">
                                  სერვისი არ არის არჩეული
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenBookingMenuId((current) =>
                                  current === booking.id ? null : booking.id
                                )
                              }
                              className="grid h-9 w-9 place-items-center text-2xl font-black leading-none text-[#586256] transition-colors hover:text-[#151716]"
                              aria-label="ჯავშნის მოქმედებები"
                              aria-expanded={openBookingMenuId === booking.id}
                            >
                              ⋮
                            </button>

                            {openBookingMenuId === booking.id ? (
                              <div className="absolute right-0 top-10 z-20 w-36 bg-white p-1 shadow-[0_14px_35px_rgba(21,23,22,0.14)]">
                                <button
                                  type="button"
                                  onClick={() => startEdit(booking)}
                                  className="block w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#151716] transition-colors hover:bg-[#f2f5ee]"
                                >
                                  შეცვლა
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleComplete(booking.id)}
                                  className="block w-full px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-green-800 transition-colors hover:bg-[#f2f8ed]"
                                >
                                  შესრულდა
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(booking.id)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-red-600 transition-colors hover:bg-red-50"
                                >
                                  <TrashIcon />
                                  წაშლა
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {selectedDayCompletedBookings.length ? (
                  <div className="mt-5 border-t border-[#dfe6d8] pt-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-green-800">
                      შესრულებული
                    </p>
                    <div className="space-y-2">
                      {selectedDayCompletedBookings.map((booking) => {
                        const linkedServices = bookingServicesByBookingId[booking.id] || [];
                        const fallbackService = services.find(
                          (service) => service.id === booking.service_id
                        );
                        const bookingServices = linkedServices.length
                          ? linkedServices
                          : fallbackService
                            ? [fallbackService]
                            : [];

                        return (
                          <div
                            key={booking.id}
                            className="border border-[#d9ead0] bg-[#f2f8ed] p-3 opacity-85"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-col gap-1 text-xs font-semibold text-green-900/75">
                                <span className="text-sm font-black text-green-900">
                                  {booking.start_time.substring(0, 5)} -{" "}
                                  {booking.end_time.substring(0, 5)}
                                </span>
                                <span>{booking.client_name}</span>
                                <span>{booking.client_phone}</span>
                                <span>
                                  {specialists.find(
                                    (specialist) => specialist.id === booking.specialist_id
                                  )?.name || "სპეციალისტი არ არის"}
                                </span>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {bookingServices.map((service) => (
                                    <span
                                      key={`${booking.id}-${service.id}`}
                                      className="border border-[#c8dec0] bg-white px-2 py-1 text-[10px] font-black text-green-900"
                                    >
                                      {service.title} · {formatDuration(service.duration_minutes)}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="relative shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenBookingMenuId((current) =>
                                      current === booking.id ? null : booking.id
                                    )
                                  }
                                  className="grid h-9 w-9 place-items-center text-2xl font-black leading-none text-green-900/70 transition-colors hover:text-green-900"
                                  aria-label="შესრულებული ჯავშნის მოქმედებები"
                                  aria-expanded={openBookingMenuId === booking.id}
                                >
                                  ⋮
                                </button>

                                {openBookingMenuId === booking.id ? (
                                  <div className="absolute right-0 top-10 z-20 w-32 bg-white p-1 shadow-[0_14px_35px_rgba(21,23,22,0.14)]">
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(booking.id)}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-red-600 transition-colors hover:bg-red-50"
                                    >
                                      <TrashIcon />
                                      წაშლა
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="border border-[#dfe6d8] bg-white p-5">
              <div className="mb-4 border-b border-[#dfe6d8] pb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7b8a67]">
                  თავისუფალი დროები
                </p>
                <h3 className="mt-1 text-xl font-black">
                  {!overviewSpecialistId
                    ? "აირჩიე სპეციალისტი"
                    : !selectedScheduleSpecialistAvailable
                    ? "სპეციალისტი ამ დღეს არ მუშაობს"
                    : selectedDayWorkdayIsOver
                    ? "სამუშაო საათები გასულია"
                    : selectedService
                    ? `${selectedDayFreeSlots.length} თავისუფალია ${formatDuration(selectedDuration)}-ისთვის`
                    : "აირჩიე სერვისი"}
                </h3>
                {!overviewSpecialistId ? (
                  <p className="mt-2 text-xs font-bold leading-5 text-[#586256]">
                    თავისუფალი დროების გამოსათვლელად მიმოხილვაში აირჩიე სპეციალისტი.
                  </p>
                ) : null}
                {selectedServices.length ? (
                  <p className="mt-2 text-xs font-bold leading-5 text-[#586256]">
                    {selectedServices.map((service) => service.title).join(", ")}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {!overviewSpecialistId ? (
                  <p className="text-sm font-semibold text-[#586256]">
                    თავისუფალი დროების გამოსათვლელად აირჩიე სპეციალისტი.
                  </p>
                ) : !selectedService ? (
                  <p className="text-sm font-semibold text-[#586256]">
                    თავისუფალი დროების გამოსათვლელად აირჩიე სერვისი.
                  </p>
                ) : !selectedScheduleSpecialistAvailable ? (
                  <p className="text-sm font-semibold text-[#586256]">
                    სპეციალისტი ამ დღეს არ მუშაობს.
                  </p>
                ) : selectedDayWorkdayIsOver ? (
                  <p className="text-sm font-semibold text-[#586256]">
                    სამუშაო საათები გასულია.
                  </p>
                ) : selectedDayFreeSlots.length === 0 ? (
                  <div className="space-y-2 sm:col-span-2">
                    <p className="text-sm font-semibold text-[#586256]">
                      ამ დღეს არჩეული სერვისებისთვის დრო აღარ ეტევა.
                    </p>
                    {selectedDayFreeGaps.length ? (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedDayFreeGaps.map((gap) => (
                          <div
                            key={`${gap.start}-${gap.end}`}
                            className="border border-[#d9ead0] bg-[#f2f8ed] px-3 py-3 text-left text-xs font-black text-green-800"
                          >
                            <p>{gap.start} - {gap.end}</p>
                            <p className="mt-1 text-[10px] font-bold text-green-800/70">
                              მოკლეა {formatDuration(selectedDuration)}-ისთვის
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-[#586256]">
                        ეს დღე სრულად დაკავებულია.
                      </p>
                    )}
                  </div>
                ) : (
                  selectedDayFreeSlots.map((slot) => (
                    <button
                      key={`${slot.start}-${slot.end}`}
                      type="button"
                      onClick={() => {
                        setSelectedDateStr(selectedScheduleDateStr);
                        setSelectedSlot(slot);
                        setFormMonthDate(new Date(selectedScheduleDateStr));
                      }}
                      className="border border-[#d9ead0] bg-[#f2f8ed] px-3 py-3 text-left text-xs font-black text-green-800 transition-colors hover:border-green-700"
                    >
                      {slot.start} - {slot.end}
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}
