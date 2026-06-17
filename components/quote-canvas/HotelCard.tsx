import { BookingHandoffButton } from "@/components/booking-handoff/BookingHandoffButton";
import type { BookingHandoff } from "@/lib/booking-handoff/types";
import type { Hotel } from "@/lib/quote-engine/types";

interface Props {
  hotel: Hotel;
  handoff: BookingHandoff | null;
}

export function HotelCard({ hotel, handoff }: Props) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4">
      <h4 className="font-semibold text-neutral-900">{hotel.name}</h4>
      {hotel.stars > 0 ? (
        <p className="mt-1 text-sm text-neutral-500">{"★".repeat(hotel.stars)}</p>
      ) : null}

      <footer className="mt-3 flex items-center justify-between">
        <div className="text-sm font-semibold">
          {hotel.netPrice} {hotel.currency}/noche
        </div>
        {handoff && <BookingHandoffButton handoff={handoff} />}
      </footer>
    </article>
  );
}
