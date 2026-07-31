import { describe, it, expect } from "vitest";
import { sanitize } from "@/lib/parser/sanitize";

describe("sanitize · WhatsApp", () => {
  it("quita timestamps y nombres, conserva los cuerpos", () => {
    const raw = `[12/6/26, 10:14:32] María López: hola buenas
[12/6/26, 10:14:48] María López: queríamos ir a Ibiza en agosto
[12/6/26, 10:15:02] María López: somos 4`;

    const r = sanitize(raw);
    expect(r.channel).toBe("whatsapp");
    expect(r.turns).toHaveLength(3);
    expect(r.clean).not.toContain("10:14");
    expect(r.clean).not.toContain("María López");
    expect(r.clean).toContain("Ibiza");
    expect(r.clean).toContain("somos 4");
  });
});

describe("sanitize · email", () => {
  it("quita firma y disclaimer legal", () => {
    const raw = `Buenos días,

Quería consultar precio para Ibiza en agosto, 4 personas, algo en playa.

Un saludo,
María López
Directora Comercial
Tel: +34 600 000 000

Este mensaje y sus anexos son confidenciales y de uso exclusivo del destinatario. Si ha recibido este mensaje por error, notifíquelo al remitente.`;

    const r = sanitize(raw);
    expect(r.clean).toContain("Ibiza");
    expect(r.clean).not.toMatch(/confidenciales/i);
    expect(r.clean).not.toContain("600 000 000");
    expect(r.clean.length).toBeLessThan(raw.length / 2);
  });

  it("quita líneas citadas de la respuesta anterior", () => {
    const raw = `Perfecto, entonces el 15 mejor.

> El 8 de agosto tengo disponibilidad
> ¿te va bien?`;

    const r = sanitize(raw);
    expect(r.clean).toContain("el 15 mejor");
    expect(r.clean).not.toContain("disponibilidad");
  });
});
