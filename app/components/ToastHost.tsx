"use client";

import { useEffect, useState } from "react";
import type { ToastPayload, ToastType } from "@/lib/toast";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const toastStyles: Record<ToastType, string> = {
  success: "border-green-200 bg-green-50 text-green-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-[#c9d2c3] bg-white text-[#151716]",
};

const dotStyles: Record<ToastType, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-[#7b8a67]",
};

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      if (!detail?.message) return;

      const id = Date.now();
      setToasts((current) => [
        ...current,
        {
          id,
          message: detail.message,
          type: detail.type || "success",
        },
      ]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3600);
    };

    window.addEventListener("nail-studio:toast", handleToast);

    return () => {
      window.removeEventListener("nail-studio:toast", handleToast);
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 top-4 z-[140] grid w-[calc(100%-2rem)] max-w-sm gap-2 sm:right-6 sm:top-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 border px-4 py-3 shadow-[0_18px_55px_rgba(21,23,22,0.14)] backdrop-blur ${toastStyles[toast.type]}`}
          role="status"
        >
          <span
            className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full ${dotStyles[toast.type]}`}
          >
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <p className="text-sm font-black leading-6">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
