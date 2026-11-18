/**
 * Cliente HTTP "educado" para conectores de ingesta (FUENTES-RD.md §13).
 * Garantiza: lista cerrada de hosts, sin redirecciones a otros hosts, una solicitud
 * activa a la vez, tope por minuto, backoff ante 429/5xx y User-Agent honesto.
 * No activa ninguna fuente: quien lo use debe respetar `sources.is_active`.
 */

export interface PoliteClientOptions {
  /** Hosts permitidos (solo nombre de host, sin esquema). Lista cerrada. */
  allowedHosts: readonly string[];
  /** Identificador honesto del cliente, p. ej. "AviTech-Ingest/0.1". */
  clientName: string;
  /** Contacto institucional; obligatorio (SG-05, aun [PENDIENTE]). */
  contact: string;
  /** Peticiones por minuto. DGCP permite 60; por defecto se usa un margen. */
  maxPerMinute?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export class HostNotAllowedError extends Error {}

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|\[.*\]|\d{1,3}(\.\d{1,3}){3})$/i;

export class PoliteClient {
  private readonly hosts: Set<string>;
  private readonly maxPerMinute: number;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly userAgent: string;
  private stamps: number[] = [];
  private tail: Promise<unknown> = Promise.resolve();

  constructor(opts: PoliteClientOptions) {
    if (!opts.contact.trim()) throw new Error("contact is required");
    if (opts.allowedHosts.length === 0) throw new Error("allowedHosts is empty");
    for (const h of opts.allowedHosts) {
      if (PRIVATE_HOST.test(h)) throw new Error(`host not allowed in allowlist: ${h}`);
    }
    this.hosts = new Set(opts.allowedHosts.map((h) => h.toLowerCase()));
    this.maxPerMinute = opts.maxPerMinute ?? 50;
    this.maxRetries = opts.maxRetries ?? 3;
    this.baseBackoffMs = opts.baseBackoffMs ?? 1000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.now = opts.now ?? Date.now;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.userAgent = `${opts.clientName} (+${opts.contact})`;
  }

  private assertAllowed(url: string): URL {
    const u = new URL(url);
    if (u.protocol !== "https:") throw new HostNotAllowedError(`only https: ${url}`);
    if (!this.hosts.has(u.hostname.toLowerCase())) {
      throw new HostNotAllowedError(`host not in allowlist: ${u.hostname}`);
    }
    return u;
  }

  /** Serializa las llamadas: una activa a la vez. */
  get(url: string, init: RequestInit = {}): Promise<Response> {
    return this.enqueue(() => this.doRequest("GET", url, init));
  }

  /**
   * POST de solo consulta (APIs que reciben los filtros en el cuerpo, p. ej. BCRD).
   * Mismas garantías que `get`; nunca sigue redirecciones (un POST redirigido se devuelve tal cual).
   */
  post(url: string, init: RequestInit = {}): Promise<Response> {
    return this.enqueue(() => this.doRequest("POST", url, init));
  }

  private enqueue(fn: () => Promise<Response>): Promise<Response> {
    const run = this.tail.then(fn);
    this.tail = run.catch(() => undefined);
    return run;
  }

  private async throttle(): Promise<void> {
    for (;;) {
      const t = this.now();
      this.stamps = this.stamps.filter((s) => t - s < 60_000);
      if (this.stamps.length < this.maxPerMinute) {
        this.stamps.push(t);
        return;
      }
      await this.sleep(60_000 - (t - this.stamps[0]) + 1);
    }
  }

  private async doRequest(method: "GET" | "POST", url: string, init: RequestInit): Promise<Response> {
    this.assertAllowed(url);
    let attempt = 0;
    for (;;) {
      await this.throttle();
      const res = await this.fetchImpl(url, {
        ...init,
        method,
        redirect: "manual",
        headers: { ...(init.headers as Record<string, string>), "User-Agent": this.userAgent },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc || method !== "GET") return res;
        // Redirección solo si sigue dentro de la lista cerrada (alta explícita del host nuevo).
        return this.doRequest(method, this.assertAllowed(new URL(loc, url).toString()).toString(), init);
      }
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= this.maxRetries) return res;
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : this.baseBackoffMs * 2 ** attempt;
      attempt++;
      await this.sleep(wait);
    }
  }
}
