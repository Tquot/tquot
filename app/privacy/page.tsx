import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-body-sm text-text-2 transition-colors hover:text-ink">
        ← Volver a inicio
      </Link>
      <h1 className="mt-6 font-serif text-display-2 text-ink" style={{ fontWeight: 500 }}>
        Privacidad
      </h1>
      <p className="mt-6 text-body leading-relaxed text-text">
        TQuot trata la información de acceso, configuración comercial y datos
        necesarios para generar cotizaciones para tu agencia. Si necesitas el
        texto legal completo o ejercer derechos RGPD, escríbenos a{" "}
        <a href="mailto:hello@tquot.io" className="text-ink underline">
          hello@tquot.io
        </a>
        .
      </p>
    </main>
  );
}
