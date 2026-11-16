import { describe, expect, it, vi } from "vitest";
import { HostNotAllowedError, PoliteClient } from "@/lib/ingest/polite-client";

const base = { allowedHosts: ["datosabiertos.dgcp.gob.do"], clientName: "T/1", contact: "c@example.org" };
const ok = () => new Response("ok", { status: 200 });

describe("PoliteClient", () => {
  it("rechaza hosts fuera de la lista y http", async () => {
    const c = new PoliteClient({ ...base, fetchImpl: vi.fn() });
    await expect(c.get("https://evil.example/x")).rejects.toBeInstanceOf(HostNotAllowedError);
    await expect(c.get("http://datosabiertos.dgcp.gob.do/x")).rejects.toBeInstanceOf(HostNotAllowedError);
  });

  it("rechaza IP privadas en la lista y exige contacto", () => {
    expect(() => new PoliteClient({ ...base, allowedHosts: ["127.0.0.1"] })).toThrow();
    expect(() => new PoliteClient({ ...base, contact: " " })).toThrow();
  });

  it("envía User-Agent honesto", async () => {
    const f = vi.fn(async () => ok());
    await new PoliteClient({ ...base, fetchImpl: f }).get("https://datosabiertos.dgcp.gob.do/a");
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe("T/1 (+c@example.org)");
  });

  it("no sigue redirecciones a otro host", async () => {
    const f = vi.fn(async () => new Response(null, { status: 301, headers: { location: "https://otro.example/" } }));
    await expect(new PoliteClient({ ...base, fetchImpl: f }).get("https://datosabiertos.dgcp.gob.do/a"))
      .rejects.toBeInstanceOf(HostNotAllowedError);
  });

  it("reintenta con backoff ante 429 y respeta Retry-After", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 429, headers: { "retry-after": "2" } }))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(ok());
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => undefined);
    const res = await new PoliteClient({ ...base, fetchImpl: f, sleep }).get("https://datosabiertos.dgcp.gob.do/a");
    expect(res.status).toBe(200);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([2000, 2000]);
  });

  it("aplica el tope por minuto", async () => {
    let t = 0;
    const sleep = vi.fn(async (ms: number) => { t += ms; });
    const c = new PoliteClient({ ...base, maxPerMinute: 2, fetchImpl: vi.fn(async () => ok()), now: () => t, sleep });
    await c.get("https://datosabiertos.dgcp.gob.do/1");
    await c.get("https://datosabiertos.dgcp.gob.do/2");
    await c.get("https://datosabiertos.dgcp.gob.do/3");
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(t).toBeGreaterThanOrEqual(60_000);
  });
});
