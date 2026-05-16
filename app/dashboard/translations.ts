export type Locale = "es" | "en";

export const translations = {
  es: {
    logout: "Cerrar sesión",
    subtitle: "Motor de cotización inteligente",
    statsToday: "Cotizaciones hoy",
    statsMonth: "Cotizaciones este mes",
    statsAgencies: "Agencias activas",
    statsPdfs: "PDF generados",
    newQuote: "Nueva cotización",
    agency: "Agencia",
    recentRequests: "Peticiones recientes",
    noRequests: "No hay peticiones aún",
    greetingMorning: "Buenos días",
    greetingAfternoon: "Buenas tardes",
    greetingEvening: "Buenas noches",
    newQuotePageTitle: "Nueva cotización",
    newQuotePageSubtitle:
      "Pega la petición del cliente y genera un presupuesto profesional.",
    clientRequestLabel: "Petición del cliente",
    clientRequestPlaceholder:
      "Ej: Familia de 4, Roma y Florencia, 10 noches en junio, hoteles 4 estrellas, visita al Vaticano con acceso prioritario…",
    generateQuote: "Generar cotización",
    backToDashboard: "Volver al panel",
  },
  en: {
    logout: "Log out",
    subtitle: "Intelligent quotation engine",
    statsToday: "Quotes today",
    statsMonth: "Quotes this month",
    statsAgencies: "Active agencies",
    statsPdfs: "PDFs generated",
    newQuote: "New quote",
    agency: "Agency",
    recentRequests: "Recent requests",
    noRequests: "No requests yet",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    newQuotePageTitle: "New quote",
    newQuotePageSubtitle:
      "Paste the client request and generate a professional quote.",
    clientRequestLabel: "Client request",
    clientRequestPlaceholder:
      "E.g. Family of 4, Rome and Florence, 10 nights in June, 4-star hotels, Vatican skip-the-line tour…",
    generateQuote: "Generate quote",
    backToDashboard: "Back to dashboard",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["es"];
