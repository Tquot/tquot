import Link from "next/link";

export function FinalCTA() {
  return (
    <section id="cta" className="bg-ink py-20 text-paper sm:py-24">
      <div className="mx-auto max-w-[1200px] px-5 text-center">
        <h2
          className="mx-auto mb-5 max-w-[720px] font-serif text-display-2 leading-[1.05] tracking-[-0.022em] text-paper"
          style={{ fontWeight: 500 }}
        >
          Empieza a cotizar en minutos,
          <br />
          no en horas.
        </h2>
        <p className="mx-auto mb-8 max-w-[560px] text-h3 font-normal text-paper/80">
          Únete a las agencias que ya prueban TQuot en acceso anticipado.
        </p>
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-md bg-paper px-7 text-body font-medium text-ink transition-colors hover:bg-paper-2"
        >
          Solicitar acceso
        </Link>
        <div className="mx-auto mt-8 h-px w-12 bg-umber" />
      </div>
    </section>
  );
}
