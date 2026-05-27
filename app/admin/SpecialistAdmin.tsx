"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/lib/toast";
import {
  SpecialistTimeOff,
  TimeOffBySpecialist,
  WorkingDaysBySpecialist,
  specialistIsTimeOffOnDate,
  specialistWorksOnDate,
} from "@/lib/availability";

interface Service {
  id: string;
  title: string;
}

interface Specialist {
  id: string;
  name: string;
  active: boolean;
  sort_order: number | null;
}

interface SpecialistServiceRow {
  specialist_id: string;
  service_id: string;
}

interface SpecialistWorkingDayRow {
  specialist_id: string;
  weekday: number;
}

const weekdayOptions = [
  { value: 1, label: "ორშ" },
  { value: 2, label: "სამ" },
  { value: 3, label: "ოთხ" },
  { value: 4, label: "ხუთ" },
  { value: 5, label: "პარ" },
  { value: 6, label: "შაბ" },
  { value: 0, label: "კვი" },
];

const emptyForm = {
  name: "",
  active: true,
  sort_order: "1",
  serviceIds: [] as string[],
  workingDays: [1, 2, 3, 4, 5, 6] as number[],
};

function formatDateString(date: Date) {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
}

export function SpecialistAdmin() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceIdsBySpecialistId, setServiceIdsBySpecialistId] = useState<
    Record<string, string[]>
  >({});
  const [workingDaysBySpecialist, setWorkingDaysBySpecialist] =
    useState<WorkingDaysBySpecialist>({});
  const [timeOffBySpecialist, setTimeOffBySpecialist] =
    useState<TimeOffBySpecialist>({});
  const [timeOffForm, setTimeOffForm] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const fetchSpecialistData = useCallback(async () => {
    const [
      specialistsResult,
      servicesResult,
      linksResult,
      workingDaysResult,
      timeOffResult,
    ] = await Promise.all([
      supabase
        .from("specialists")
        .select("id, name, active, sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("services")
        .select("id, title")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase.from("specialist_services").select("specialist_id, service_id"),
      supabase.from("specialist_working_days").select("specialist_id, weekday"),
      supabase
        .from("specialist_time_off")
        .select("id, specialist_id, start_date, end_date, reason")
        .order("start_date", { ascending: true }),
    ]);

    if (
      specialistsResult.error ||
      servicesResult.error ||
      linksResult.error ||
      workingDaysResult.error ||
      timeOffResult.error
    ) {
      setLoadError(
        specialistsResult.error?.message ||
          servicesResult.error?.message ||
          linksResult.error?.message ||
          workingDaysResult.error?.message ||
          timeOffResult.error?.message ||
          "სპეციალისტები ვერ ჩაიტვირთა. გაუშვი supabase/add_specialists.sql."
      );
      return;
    }

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

    setLoadError("");
    setSpecialists(specialistsResult.data || []);
    setServices(servicesResult.data || []);
    setServiceIdsBySpecialistId(links);
    setWorkingDaysBySpecialist(workingDays);
    setTimeOffBySpecialist(timeOff);
  }, []);

  useEffect(() => {
    fetchSpecialistData();

    const channel = supabase
      .channel("specialist-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialists" },
        fetchSpecialistData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialist_services" },
        fetchSpecialistData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialist_working_days" },
        fetchSpecialistData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "specialist_time_off" },
        fetchSpecialistData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSpecialistData]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setTimeOffForm({ start_date: "", end_date: "", reason: "" });
  };

  const startEdit = (specialist: Specialist) => {
    setEditingId(specialist.id);
    setForm({
      name: specialist.name,
      active: specialist.active,
      sort_order: String(specialist.sort_order ?? specialists.length + 1),
      serviceIds: serviceIdsBySpecialistId[specialist.id] || [],
      workingDays: workingDaysBySpecialist[specialist.id] || [0, 1, 2, 3, 4, 5, 6],
    });
  };

  const toggleService = (id: string) => {
    setForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(id)
        ? current.serviceIds.filter((item) => item !== id)
        : [...current.serviceIds, id],
    }));
  };

  const toggleWorkingDay = (weekday: number) => {
    setForm((current) => {
      const exists = current.workingDays.includes(weekday);

      return {
        ...current,
        workingDays: exists
          ? current.workingDays.filter((day) => day !== weekday)
          : [...current.workingDays, weekday].sort((first, second) => first - second),
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    const specialistId = editingId || crypto.randomUUID();
    const { error } = await supabase.from("specialists").upsert(
      {
        id: specialistId,
        name: form.name.trim(),
        active: form.active,
        sort_order: Number(form.sort_order),
      },
      { onConflict: "id" }
    );

    if (error) {
      setLoading(false);
      showToast("შეცდომა: " + error.message, "error");
      return;
    }

    const { error: deleteLinksError } = await supabase
      .from("specialist_services")
      .delete()
      .eq("specialist_id", specialistId);

    if (deleteLinksError) {
      setLoading(false);
      showToast("შეცდომა: " + deleteLinksError.message, "error");
      return;
    }

    if (form.serviceIds.length) {
      const { error: insertLinksError } = await supabase
        .from("specialist_services")
        .insert(
          form.serviceIds.map((serviceId) => ({
            specialist_id: specialistId,
            service_id: serviceId,
          }))
        );

      if (insertLinksError) {
        setLoading(false);
        showToast("შეცდომა: " + insertLinksError.message, "error");
        return;
      }
    }

    const { error: deleteWorkingDaysError } = await supabase
      .from("specialist_working_days")
      .delete()
      .eq("specialist_id", specialistId);

    if (deleteWorkingDaysError) {
      setLoading(false);
      showToast("შეცდომა: " + deleteWorkingDaysError.message, "error");
      return;
    }

    if (form.workingDays.length) {
      const { error: insertWorkingDaysError } = await supabase
        .from("specialist_working_days")
        .insert(
          form.workingDays.map((weekday) => ({
            specialist_id: specialistId,
            weekday,
          }))
        );

      if (insertWorkingDaysError) {
        setLoading(false);
        showToast("შეცდომა: " + insertWorkingDaysError.message, "error");
        return;
      }
    }

    setLoading(false);
    showToast(editingId ? "სპეციალისტი განახლდა." : "სპეციალისტი დაემატა.", "success");
    resetForm();
    fetchSpecialistData();
  };

  const toggleActive = async (specialist: Specialist) => {
    const { error } = await supabase
      .from("specialists")
      .update({ active: !specialist.active })
      .eq("id", specialist.id);

    if (error) {
      showToast("შეცდომა: " + error.message, "error");
      return;
    }

    fetchSpecialistData();
    showToast(
      specialist.active ? "სპეციალისტი დაიმალა." : "სპეციალისტი გამოჩნდა.",
      "success"
    );
  };

  const deleteSpecialist = async (specialist: Specialist) => {
    if (!confirm(`წავშალო სპეციალისტი: ${specialist.name}?`)) return;

    const { error } = await supabase
      .from("specialists")
      .delete()
      .eq("id", specialist.id);

    if (error) {
      showToast("შეცდომა: " + error.message, "error");
      return;
    }

    if (editingId === specialist.id) resetForm();
    fetchSpecialistData();
    showToast("სპეციალისტი წაიშალა.", "success");
  };

  const addTimeOff = async () => {
    if (!editingId || !timeOffForm.start_date || !timeOffForm.end_date) return;

    if (timeOffForm.end_date < timeOffForm.start_date) {
      showToast("დასრულების თარიღი დაწყებაზე ადრე ვერ იქნება.", "error");
      return;
    }

    const { error } = await supabase.from("specialist_time_off").insert({
      specialist_id: editingId,
      start_date: timeOffForm.start_date,
      end_date: timeOffForm.end_date,
      reason: timeOffForm.reason.trim() || null,
    });

    if (error) {
      showToast("შეცდომა: " + error.message, "error");
      return;
    }

    setTimeOffForm({ start_date: "", end_date: "", reason: "" });
    fetchSpecialistData();
    showToast("დასვენების პერიოდი დაემატა.", "success");
  };

  const deleteTimeOff = async (id?: string) => {
    if (!id) return;

    const { error } = await supabase.from("specialist_time_off").delete().eq("id", id);

    if (error) {
      showToast("შეცდომა: " + error.message, "error");
      return;
    }

    fetchSpecialistData();
    showToast("დასვენების პერიოდი წაიშალა.", "success");
  };

  return (
    <section className="border border-[#c9d2c3] bg-white p-4 shadow-[0_15px_40px_rgba(21,23,22,0.02)] sm:p-6">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#c9d2c3] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#7b8a67]">
            სპეციალისტები
          </p>
          <h2 className="text-2xl font-black tracking-normal">
            სპეციალისტების მართვა
          </h2>
        </div>
        <p className="text-xs font-bold text-[#586256]">
          {specialists.length} სპეციალისტი სულ
        </p>
      </div>

      {loadError ? (
        <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
          {loadError}
          <br />
          გაუშვი <span className="font-black">supabase/add_specialists.sql</span>{" "}
          Supabase SQL Editor-ში.
        </div>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[420px_1fr] 2xl:gap-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[0.6fr_1fr]">
            <label className="border-b border-[#c9d2c3] pb-2">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                რიგი
              </span>
              <input
                type="number"
                min="1"
                required
                value={form.sort_order}
                onChange={(event) =>
                  setForm({ ...form, sort_order: event.target.value })
                }
                className="w-full bg-transparent text-sm font-bold focus:outline-none"
              />
            </label>

            <label className="border-b border-[#c9d2c3] pb-2">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                სახელი
              </span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="ნინო"
                className="w-full bg-transparent text-sm font-bold focus:outline-none"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
              სერვისები
            </p>
            <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {services.map((service) => {
                const isSelected = form.serviceIds.includes(service.id);

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`border px-3 py-2 text-left text-xs font-black transition-colors ${
                      isSelected
                        ? "border-[#151716] bg-[#151716] text-white"
                        : "border-[#dfe6d8] text-[#151716] hover:border-[#151716]"
                    }`}
                  >
                    {service.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
              სამუშაო დღეები
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {weekdayOptions.map((day) => {
                const isSelected = form.workingDays.includes(day.value);

                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWorkingDay(day.value)}
                    className={`border px-2 py-2 text-[10px] font-black uppercase transition-colors ${
                      isSelected
                        ? "border-[#151716] bg-[#151716] text-white"
                        : "border-[#dfe6d8] text-[#586256] hover:border-[#151716]"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {editingId ? (
            <div className="border border-[#dfe6d8] bg-[#f7f8f5] p-3">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                არ ყოფნის პერიოდი
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="border-b border-[#c9d2c3] pb-2">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                    დაწყება
                  </span>
                  <input
                    type="date"
                    value={timeOffForm.start_date}
                    onChange={(event) =>
                      setTimeOffForm((current) => ({
                        ...current,
                        start_date: event.target.value,
                      }))
                    }
                    className="w-full bg-transparent text-sm font-bold focus:outline-none"
                  />
                </label>

                <label className="border-b border-[#c9d2c3] pb-2">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                    დასრულება
                  </span>
                  <input
                    type="date"
                    value={timeOffForm.end_date}
                    onChange={(event) =>
                      setTimeOffForm((current) => ({
                        ...current,
                        end_date: event.target.value,
                      }))
                    }
                    className="w-full bg-transparent text-sm font-bold focus:outline-none"
                  />
                </label>
              </div>

              <input
                type="text"
                value={timeOffForm.reason}
                onChange={(event) =>
                  setTimeOffForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="მიზეზი, მაგალითად პირადი საქმე"
                className="mt-3 w-full border-b border-[#c9d2c3] bg-transparent pb-2 text-sm font-bold focus:outline-none"
              />

              <button
                type="button"
                onClick={addTimeOff}
                className="mt-3 border border-[#151716] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#151716] hover:bg-[#151716] hover:text-white"
              >
                დამატება
              </button>

              <div className="mt-3 space-y-2">
                {(timeOffBySpecialist[editingId] || []).map((period) => (
                  <div
                    key={period.id}
                    className="flex items-center justify-between gap-3 border border-[#dfe6d8] bg-white px-3 py-2 text-xs font-bold text-[#586256]"
                  >
                    <span>
                      {period.start_date} - {period.end_date}
                      {period.reason ? ` · ${period.reason}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteTimeOff(period.id)}
                      className="text-[10px] font-black uppercase text-red-600"
                    >
                      წაშლა
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <label className="flex items-center gap-3 text-sm font-bold text-[#586256]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
              className="h-4 w-4 accent-[#151716]"
            />
            აქტიური სპეციალისტი
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#151716] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white transition-colors hover:bg-[#2f3430] disabled:bg-[#c9d2c3]"
            >
              {loading ? "ინახება..." : editingId ? "განახლება" : "დამატება"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="border border-[#c9d2c3] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#151716]"
              >
                გაუქმება
              </button>
            ) : null}
          </div>
        </form>

        <div className="space-y-2">
          {specialists.map((specialist) => {
            const specialistServiceIds = serviceIdsBySpecialistId[specialist.id] || [];
            const specialistServices = services.filter((service) =>
              specialistServiceIds.includes(service.id)
            );
            const todayStr = formatDateString(new Date());
            const specialistTimeOff = timeOffBySpecialist[specialist.id] || [];
            const activeTimeOff = specialistTimeOff.find(
              (period) => period.start_date <= todayStr && period.end_date >= todayStr
            );
            const upcomingTimeOff = specialistTimeOff.find(
              (period) => period.end_date >= todayStr
            );
            const activeReason = activeTimeOff?.reason?.trim() || "არ არის ადგილზე";
            const upcomingReason = upcomingTimeOff?.reason?.trim() || "არ არის ადგილზე";
            const isOnVacation = specialistIsTimeOffOnDate(
              specialist.id,
              timeOffBySpecialist,
              todayStr
            );
            const worksToday = specialistWorksOnDate(
              specialist.id,
              new Date(),
              workingDaysBySpecialist,
              timeOffBySpecialist,
              todayStr
            );
            const workingDayLabels = (workingDaysBySpecialist[specialist.id] || [])
              .map(
                (weekday) =>
                  weekdayOptions.find((option) => option.value === weekday)?.label
              )
              .filter(Boolean);

            return (
              <div
                key={specialist.id}
                className={`grid gap-4 border p-4 md:grid-cols-[56px_1fr_auto] md:items-center ${
                  isOnVacation || !worksToday
                    ? "border-[#dfe6d8] bg-[#f2f5ee]"
                    : specialist.active
                    ? "border-[#dfe6d8]"
                    : "border-[#dfe6d8] bg-[#f2f5ee] opacity-70"
                }`}
              >
                <p className="text-xl font-black text-[#7b8a67]">
                  {specialist.sort_order ?? "-"}
                </p>

                <div>
                  <h3 className="text-base font-black text-[#151716]">
                    {specialist.name}
                  </h3>
                  {isOnVacation ? (
                    <p className="mt-2 inline-block bg-[#151716] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white">
                      {activeReason}
                    </p>
                  ) : null}
                  {!activeTimeOff && upcomingTimeOff ? (
                    <p className="mt-2 inline-block bg-[#dfe8d5] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#151716]">
                      {upcomingReason}: {upcomingTimeOff.start_date} - {upcomingTimeOff.end_date}
                    </p>
                  ) : null}
                  {!isOnVacation && !worksToday ? (
                    <p className="mt-2 inline-block border border-[#c9d2c3] bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#586256]">
                      დღეს არ მუშაობს
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-[#586256]">
                    {specialistServices.length
                      ? specialistServices.map((service) => service.title).join(", ")
                      : "სერვისები არ არის არჩეული"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#7b8a67]">
                    {workingDayLabels.length
                      ? `სამუშაო დღეები: ${workingDayLabels.join(", ")}`
                      : "სამუშაო დღეები არ არის არჩეული"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => startEdit(specialist)}
                    className="border border-[#c9d2c3] px-3 py-2 text-[10px] font-bold text-[#151716] hover:bg-[#f2f5ee]"
                  >
                    შეცვლა
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(specialist)}
                    className="border border-[#c9d2c3] px-3 py-2 text-[10px] font-bold text-[#586256] hover:bg-[#f2f5ee]"
                  >
                    {specialist.active ? "დამალვა" : "გამოჩენა"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSpecialist(specialist)}
                    className="border border-transparent px-3 py-2 text-[10px] font-bold text-red-600 hover:border-red-200 hover:bg-red-50"
                  >
                    წაშლა
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
