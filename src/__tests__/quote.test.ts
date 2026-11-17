import { describe, expect, it } from "vitest";
import { locateQuote, normalizeSpaces } from "@/lib/quote";

const text = "El Gobierno firmó hoy\n  la concesión de espectro con la empresa,   por un plazo de 20 años.";

describe("locateQuote", () => {
  it("encuentra la cita tolerando solo espacios en blanco", () => {
    const m = locateQuote("firmó hoy la concesión de espectro", text);
    expect(m).not.toBeNull();
    expect(normalizeSpaces(text).slice(m!.start, m!.end)).toBe("firmó hoy la concesión de espectro");
  });
  it("quita comillas externas pegadas", () => {
    expect(locateQuote("  «por un plazo de 20 años.»", text)?.quote).toBe("por un plazo de 20 años.");
  });
  it("no acepta otra ortografía ni mayúsculas distintas", () => {
    expect(locateQuote("firmo hoy la concesion de espectro", text)).toBeNull();
    expect(locateQuote("FIRMÓ HOY LA CONCESIÓN DE ESPECTRO", text)).toBeNull();
  });
  it("rechaza citas cortas, ausentes o sin texto de fuente", () => {
    expect(locateQuote("concesión", text)).toBeNull();
    expect(locateQuote("una frase que no está en el texto original", text)).toBeNull();
    expect(locateQuote("firmó hoy la concesión de espectro", null)).toBeNull();
  });
  it("rechaza citas de más de 1000 caracteres", () => {
    const long = "a".repeat(1001);
    expect(locateQuote(long, long)).toBeNull();
  });
});
