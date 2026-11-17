import { describe, expect, it } from "vitest";
import { extractArticleText } from "@/lib/ingest/article";

describe("extractArticleText", () => {
  it("toma el <article>, quita menús/scripts y decodifica entidades", () => {
    const html = `<html><body><nav>Inicio | Contacto</nav><article><h1>Concesi&oacute;n</h1><script>x()</script>
      <p>El Indotel &amp; las empresas firmaron la concesi&#243;n.</p></article><footer>Pie</footer></body></html>`;
    const t = extractArticleText(html);
    expect(t).toContain("El Indotel & las empresas firmaron la concesión.");
    expect(t).not.toMatch(/Inicio|Contacto|Pie|x\(\)/);
  });
  it("acota el largo", () => {
    expect(extractArticleText(`<article>${"palabra ".repeat(3000)}</article>`).length).toBeLessThanOrEqual(8001);
  });
});
