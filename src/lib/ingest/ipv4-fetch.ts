import https from "node:https";

/**
 * `fetch` mínimo que sale siempre por IPv4 (el BCRD solo autoriza IPs v4). Sin efectos globales:
 * no cambia el orden de resolución DNS del proceso. Solo https, sin seguir redirecciones (las
 * devuelve tal cual, como `redirect: "manual"`), con tiempo límite.
 */
export function createIpv4Fetch(timeoutMs = 20_000): typeof fetch {
  return (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (url.protocol !== "https:") throw new Error("ipv4Fetch solo admite https");
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const body = typeof init.body === "string" ? init.body : undefined;
    if (body !== undefined) headers["content-length"] = String(Buffer.byteLength(body));
    return new Promise<Response>((resolve, reject) => {
      const req = https.request(
        url,
        { method: init.method ?? "GET", headers, family: 4, timeout: timeoutMs },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => {
            const h = new Headers();
            for (const [k, v] of Object.entries(res.headers)) {
              if (v !== undefined) h.set(k, Array.isArray(v) ? v.join(", ") : v);
            }
            const status = res.statusCode ?? 502;
            const nullBody = status === 204 || status === 304 || (status >= 300 && status < 400);
            resolve(new Response(nullBody ? null : Buffer.concat(chunks), { status, headers: h }));
          });
          res.on("error", reject);
        },
      );
      req.on("timeout", () => req.destroy(new Error(`timeout tras ${timeoutMs} ms`)));
      req.on("error", reject);
      if (body !== undefined) req.write(body);
      req.end();
    });
  }) as typeof fetch;
}
