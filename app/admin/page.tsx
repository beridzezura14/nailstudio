import type { Metadata } from "next";
import AdminAuthGate from "./AdminAuthGate";
import { BookingAdmin } from "./BookingAdmin";

export const metadata: Metadata = {
  title: "ადმინი",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <AdminAuthGate>
      <BookingAdmin />
    </AdminAuthGate>
  );
}
