"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/lib/toast";

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

const emptyForm = {
  name: "",
  active: true,
  sort_order: "1",
  serviceIds: [] as string[],
};

export function SpecialistAdmin() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceIdsBySpecialistId, setServiceIdsBySpecialistId] = useState<
    Record<string, string[]>
  >({});
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const fetchSpecialistData = useCallback(async () => {
    const [specialistsResult, servicesResult, linksResult] = await Promise.all([
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
    ]);

    if (specialistsResult.error || servicesResult.error || linksResult.error) {
      setLoadError(
        specialistsResult.error?.message ||
          servicesResult.error?.message ||
          linksResult.error?.message ||
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

    setLoadError("");
    setSpecialists(specialistsResult.data || []);
    setServices(servicesResult.data || []);
    setServiceIdsBySpecialistId(links);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSpecialistData]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (specialist: Specialist) => {
    setEditingId(specialist.id);
    setForm({
      name: specialist.name,
      active: specialist.active,
      sort_order: String(specialist.sort_order ?? specialists.length + 1),
      serviceIds: serviceIdsBySpecialistId[specialist.id] || [],
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

            return (
              <div
                key={specialist.id}
                className={`grid gap-4 border p-4 md:grid-cols-[56px_1fr_auto] md:items-center ${
                  specialist.active
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
                  <p className="mt-2 text-sm leading-6 text-[#586256]">
                    {specialistServices.length
                      ? specialistServices.map((service) => service.title).join(", ")
                      : "სერვისები არ არის არჩეული"}
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
