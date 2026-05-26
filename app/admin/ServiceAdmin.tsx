"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/lib/toast";

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  duration_minutes: number;
  active: boolean;
  sort_order: number | null;
}

const emptyForm = {
  id: "",
  title: "",
  description: "",
  price: "0",
  duration_minutes: "30",
  active: true,
  sort_order: "1",
};

export function ServiceAdmin() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("services")
      .select("id, title, description, price, duration_minutes, active, sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      return {
        data: [],
        error:
          error.message ||
          "სერვისები ვერ ჩაიტვირთა. გადაამოწმე, რომ services ცხრილში sort_order სვეტი არსებობს.",
      };
    }

    return { data: data ?? [], error: "" };
  }, []);

  const refreshServices = useCallback(async () => {
    const result = await fetchServices();
    setLoadError(result.error);
    setServices(result.data);
    window.dispatchEvent(new Event("services-updated"));
  }, [fetchServices]);

  useEffect(() => {
    let isMounted = true;

    fetchServices().then((result) => {
      if (!isMounted) return;
      setLoadError(result.error);
      setServices(result.data);
    });

    const channel = supabase
      .channel("service-admin-services")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        () => {
          refreshServices();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchServices, refreshServices]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (service: Service) => {
    setEditingId(service.id);
    setForm({
      id: service.id,
      title: service.title,
      description: service.description,
      price: String(service.price),
      duration_minutes: String(service.duration_minutes),
      active: service.active,
      sort_order: String(service.sort_order ?? services.length + 1),
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;

    setLoading(true);

    const payload = {
      id: editingId || crypto.randomUUID(),
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      duration_minutes: Number(form.duration_minutes),
      active: form.active,
      sort_order: Number(form.sort_order),
    };

    const { error } = await supabase.from("services").upsert(payload, {
      onConflict: "id",
    });

    setLoading(false);

    if (error) {
      showToast("შეცდომა: " + error.message, "error");
      return;
    }

    showToast(editingId ? "სერვისი განახლდა." : "სერვისი დაემატა.", "success");
    resetForm();
    refreshServices();
  };

  const toggleActive = async (service: Service) => {
    const { error } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id);

    if (error) {
      showToast("შეცდომა: " + error.message, "error");
      return;
    }

    refreshServices();
    showToast(service.active ? "სერვისი დაიმალა." : "სერვისი გამოჩნდა.", "success");
  };

  const deleteService = async (service: Service) => {
    if (!confirm(`წავშალო სერვისი: ${service.title}?`)) return;

    const { error } = await supabase.from("services").delete().eq("id", service.id);

    if (error) {
      showToast("შეცდომა: " + error.message, "error");
      return;
    }

    if (editingId === service.id) resetForm();
    refreshServices();
    showToast("სერვისი წაიშალა.", "success");
  };

  return (
    <section className="mb-8 border border-[#c9d2c3] bg-white p-4 shadow-[0_15px_40px_rgba(21,23,22,0.02)] sm:p-6">
      <div className="mb-6 flex flex-col gap-3 border-b border-[#c9d2c3] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#7b8a67]">
            სერვისები
          </p>
          <h2 className="text-2xl font-black tracking-normal">სერვისების მართვა</h2>
        </div>
        <p className="text-xs font-bold text-[#586256]">
          {services.length} სერვისი სულ
        </p>
      </div>

      {loadError && (
        <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
          {loadError}
          <br />
          გაუშვი <span className="font-black">supabase/upsert_services.sql</span>{" "}
          Supabase SQL Editor-ში და შემდეგ განაახლე გვერდი.
        </div>
      )}

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
                დასახელება
              </span>
              <input
                type="text"
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="გელ-ლაქი / შილაკი"
                className="w-full bg-transparent text-sm font-bold focus:outline-none"
              />
            </label>
          </div>

          <label className="block border-b border-[#c9d2c3] pb-2">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
              აღწერა
            </span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="მოკლე აღწერა"
              className="w-full resize-none bg-transparent text-sm font-semibold leading-6 focus:outline-none"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="border-b border-[#c9d2c3] pb-2">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                ფასი
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                className="w-full bg-transparent text-sm font-bold focus:outline-none"
              />
            </label>

            <label className="border-b border-[#c9d2c3] pb-2">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#7b8a67]">
                ხანგრძლივობა
              </span>
              <input
                type="number"
                min="15"
                step="15"
                required
                value={form.duration_minutes}
                onChange={(event) =>
                  setForm({ ...form, duration_minutes: event.target.value })
                }
                className="w-full bg-transparent text-sm font-bold focus:outline-none"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm font-bold text-[#586256]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
              className="h-4 w-4 accent-[#151716]"
            />
            აქტიური სერვისი
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#151716] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white transition-colors hover:bg-[#2f3430] disabled:bg-[#c9d2c3]"
            >
              {loading ? "ინახება..." : editingId ? "განახლება" : "დამატება"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="border border-[#c9d2c3] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#151716]"
              >
                გაუქმება
              </button>
            )}
          </div>
        </form>

        <div className="space-y-2">
          {services.map((service) => (
            <div
              key={service.id}
              className={`grid gap-4 border p-4 md:grid-cols-[56px_1fr_auto] md:items-center ${
                service.active ? "border-[#dfe6d8]" : "border-[#dfe6d8] bg-[#f2f5ee] opacity-70"
              }`}
            >
              <p className="text-xl font-black text-[#7b8a67]">
                {service.sort_order ?? "-"}
              </p>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-black text-[#151716]">
                    {service.title}
                  </h3>
                  <span className="text-xs font-bold text-[#586256]">
                    {service.duration_minutes} წთ
                  </span>
                  <span className="text-xs font-bold text-[#586256]">
                    ₾{service.price}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#586256]">
                  {service.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => startEdit(service)}
                  className="border border-[#c9d2c3] px-3 py-2 text-[10px] font-bold text-[#151716] hover:bg-[#f2f5ee]"
                >
                  შეცვლა
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(service)}
                  className="border border-[#c9d2c3] px-3 py-2 text-[10px] font-bold text-[#586256] hover:bg-[#f2f5ee]"
                >
                  {service.active ? "დამალვა" : "გამოჩენა"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteService(service)}
                  className="border border-transparent px-3 py-2 text-[10px] font-bold text-red-600 hover:border-red-200 hover:bg-red-50"
                >
                  წაშლა
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
