import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-body-sm text-text-2 transition-colors hover:text-ink">
        ← Volver a inicio
      </Link>
      <h1 className="mt-6 font-serif text-display-2 text-ink" style={{ fontWeight: 500 }}>
        Términos
      </h1>
      <p className="mt-6 text-body leading-relaxed text-text">
        El acceso a TQuot está sujeto a disponibilidad del servicio, plan
        contratado y credenciales válidas de los proveedores conectados por la
        agencia. Para condiciones comerciales y uso del acceso anticipado,
        contáctanos en{" "}
        <a href="mailto:hello@tquot.io" className="text-ink underline">
          hello@tquot.io
        </a>
        .
      </p>
    </main>
  );
}
