import AdminAuthGate from "./AdminAuthGate";
import { BookingAdmin } from "./BookingAdmin";

export default function AdminPage() {
  return (
    <AdminAuthGate>
      <BookingAdmin />
    </AdminAuthGate>
  );
}
