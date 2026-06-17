import { loadBookingConfig, updateBookingConfig } from "@/lib/booking-handoff/config";
import { BookingSettingsForm } from "./BookingSettingsForm";

export default async function BookingSettingsPage() {
  const config = await loadBookingConfig();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold">Configuración de reservas</h1>
      <p className="mb-6 text-sm text-neutral-600">
        URLs de extranet y aerolíneas que se abren desde los botones de reserva.
      </p>
      <BookingSettingsForm initial={config} action={updateBookingConfig} />
    </div>
  );
}
