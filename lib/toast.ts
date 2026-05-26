export type ToastType = "success" | "error" | "info";

export interface ToastPayload {
  message: string;
  type?: ToastType;
}

export function showToast(message: string, type: ToastType = "success") {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ToastPayload>("nail-studio:toast", {
      detail: { message, type },
    })
  );
}
