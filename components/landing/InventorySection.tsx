import { Eyebrow } from "@/components/ui/Eyebrow";

interface HotelData {
  name: string;
  stars: number;
  location: string;
  board: string;
  pricePerNight: number;
  provider: "Tu inventario" | "Hotelbeds" | "Booking";
  image: string;
  selected?: boolean;
}

const HOTELS: HotelData[] = [
  {
    name: "Barceló Teguise Beach",
    stars: 4,
    location: "Playa Blanca",
    board: "SA / Desayuno",
    pricePerNight: 120,
    provider: "Tu inventario",
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=800&fit=crop",
    selected: true,
  },
  {
    name: "H10 Rubicón Palace",
    stars: 5,
    location: "Playa Blanca",
    board: "Todo incluido",
    pricePerNight: 187,
    provider: "Hotelbeds",
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&h=800&fit=crop",
  },
  {
    name: "Princesa Yaiza Suite",
    stars: 5,
    location: "Playa Blanca",
    board: "SA",
    pricePerNight: 215,
    provider: "Booking",
    image:
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&h=800&fit=crop",
  },
  {
    name: "Hotel THe Volcán",
    stars: 5,
    location: "Playa Blanca",
    board: "AD",
    pricePerNight: 165,
    provider: "Hotelbeds",
    image:
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&h=800&fit=crop",
  },
];

export function InventorySection() {
  return (
    <section id="hoteles" className="py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">Alojamiento</Eyebrow>
        <h2 className="mb-3 max-w-[680px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          Tu inventario primero. Luego tus proveedores.
        </h2>
        <p className="mb-10 max-w-[640px] text-[17px] text-text-2">
          TQuot prioriza tus tarifas negociadas. Si no hay suficientes opciones,
          completa con Hotelbeds y Booking.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOTELS.map((hotel) => (
            <HotelCard key={hotel.name} hotel={hotel} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HotelCard({ hotel }: { hotel: HotelData }) {
  const isOwn = hotel.provider === "Tu inventario";

  return (
    <article
      className={
        "group overflow-hidden rounded-lg bg-paper transition-shadow duration-180 " +
        (hotel.selected
          ? "border-2 border-ink shadow-card-hover"
          : "border border-border-1 shadow-card hover:shadow-card-hover")
      }
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-paper-3">
        <img
          src={hotel.image}
          alt={hotel.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink/40 to-transparent" />
        <span
          className={
            "absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider " +
            (isOwn
              ? "bg-umber/95 text-paper"
              : "bg-paper/95 text-ink backdrop-blur-sm")
          }
        >
          {hotel.provider}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-serif text-[18px] leading-tight text-ink" style={{ fontWeight: 500 }}>
          {hotel.name}
        </h3>
        <div className="mt-1 text-[10px] tracking-wider text-umber">
          {"★".repeat(hotel.stars)}
        </div>
        <p className="mt-2 text-[12px] text-text-2">
          {hotel.location} · {hotel.board}
        </p>
        <div className="mt-3 flex items-end justify-between border-t border-border-1 pt-3">
          <div>
            <Eyebrow>/ noche</Eyebrow>
            <div className="mt-0.5 font-mono text-[18px] text-ink tabular-nums">
              {hotel.pricePerNight} €
            </div>
          </div>
          {hotel.selected ? (
            <span className="text-[11px] font-medium text-success">
              Seleccionado ✓
            </span>
          ) : (
            <button className="text-[11px] font-medium text-ink transition-colors hover:text-umber">
              Usar →
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
