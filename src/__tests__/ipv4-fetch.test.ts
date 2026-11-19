import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: { url: URL; opts: Record<string, unknown>; written: string[] }[] = [];
let reply: { status: number; headers: Record<string, string | string[]>; body: string } = { status: 200, headers: {}, body: "" };
let failWith: Error | null = null;
let timeout = false;

vi.mock("node:https", () => ({
  default: {
    request: (url: URL, opts: Record<string, unknown>, cb: (res: EventEmitter & { statusCode: number; headers: unknown }) => void) => {
      const req = new EventEmitter() as EventEmitter & { write: (s: string) => void; end: () => void; destroy: (e: Error) => void };
      const entry = { url, opts, written: [] as string[] };
      calls.push(entry);
      req.write = (s) => entry.written.push(s);
      req.destroy = (e) => req.emit("error", e);
      req.end = () => {
        if (timeout) return void req.emit("timeout");
        if (failWith) return void req.emit("error", failWith);
        const res = Object.assign(new EventEmitter(), { statusCode: reply.status, headers: reply.headers });
        cb(res);
        res.emit("data", Buffer.from(reply.body));
        res.emit("end");
      };
      return req;
    },
  },
}));

const { createIpv4Fetch } = await import("@/lib/ingest/ipv4-fetch");

beforeEach(() => {
  calls.length = 0;
  reply = { status: 200, headers: {}, body: "" };
  failWith = null;
  timeout = false;
});

describe("createIpv4Fetch", () => {
  it("fuerza IPv4, envía cuerpo y longitud, y devuelve la respuesta", async () => {
    reply = { status: 200, headers: { "content-type": "application/json", "set-cookie": ["a=1", "b=2"] }, body: '{"ok":true}' };
    const res = await createIpv4Fetch()("https://api.example.org/x", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect(calls[0].opts).toMatchObject({ method: "POST", family: 4 });
    expect((calls[0].opts.headers as Record<string, string>)["content-length"]).toBe("2");
    expect(calls[0].written).toEqual(["{}"]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("set-cookie")).toBe("a=1, b=2");
  });

  it("GET por defecto y redirecciones sin cuerpo ni seguimiento", async () => {
    reply = { status: 302, headers: { location: "https://otro.example/" }, body: "x" };
    const res = await createIpv4Fetch()(new URL("https://api.example.org/y"));
    expect(calls[0].opts.method).toBe("GET");
    expect(res.status).toBe(302);
    expect(calls).toHaveLength(1);
  });

  it("rechaza http, errores de red y tiempo agotado", async () => {
    await expect(createIpv4Fetch()("http://api.example.org/")).rejects.toThrow(/https/);
    failWith = new Error("ECONNREFUSED");
    await expect(createIpv4Fetch()("https://api.example.org/")).rejects.toThrow("ECONNREFUSED");
    failWith = null;
    timeout = true;
    await expect(createIpv4Fetch(5)("https://api.example.org/")).rejects.toThrow(/timeout/);
  });
});
