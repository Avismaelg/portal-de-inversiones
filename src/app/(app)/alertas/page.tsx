import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { timeAgo } from "@/lib/news-format";
import { createClient } from "@/lib/supabase/server";
import { AlertForm } from "./alert-form";
import { deleteAlert, markAllNotificationsRead, markNotificationRead } from "./actions";
import { NotificationsSync } from "./notifications-sync";

export const metadata: Metadata = { title: "Alertas" };

const href = (type: string, id: string) => (type === "news" ? `/noticias/${id}` : type === "tender" ? `/licitaciones/${id}` : "/alertas");
const TYPE: Record<string, string> = { news: "Noticia", tender: "Licitación" };

async function Inbox() {
  await connection();
  const supabase = await createClient();
  const [prefs, notes] = await Promise.all([
    supabase.from("user_alert_preferences").select("id,name,keywords,is_paused").order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id,entity_type,entity_id,title,reason,priority,status,created_at,read_at")
      .in("status", ["delivered", "read"])
      .order("read_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (prefs.error || notes.error) return <p role="alert" className="text-danger">No se pudieron cargar las alertas.</p>;
  const now = new Date();
  const unread = (notes.data ?? []).filter((n) => !n.read_at).length;
  return (
    <>
      <NotificationsSync />
      <AlertForm />
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section aria-labelledby="mis" className="card self-start">
          <h2 id="mis" className="text-base font-semibold">Mis alertas</h2>
          {prefs.data?.length ? (
            <ul className="mt-3 divide-y divide-divider">
              {prefs.data.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-2 py-2 text-sm">
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-muted">{((p.keywords ?? []) as string[]).join(", ")}</span>
                  </span>
                  <form action={deleteAlert}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn-ghost" aria-label={`Eliminar alerta ${p.name}`}>Quitar</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Aún no tienes alertas. Crea una con las palabras que quieras vigilar.</p>
          )}
        </section>

        <section aria-labelledby="bandeja">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="bandeja" className="text-base font-semibold">
              Notificaciones {unread > 0 && <span className="ml-1 rounded-full bg-warning px-2 py-0.5 text-xs text-white">{unread} sin leer</span>}
            </h2>
            {unread > 0 && (
              <form action={markAllNotificationsRead}>
                <button className="btn-ghost">Marcar todas como leídas</button>
              </form>
            )}
          </div>
          {notes.data?.length ? (
            <ul className="space-y-2">
              {notes.data.map((n) => (
                <li key={n.id} className={`card flex items-start gap-3 ${n.read_at ? "opacity-70" : "border-l-4 border-l-warning"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">
                      {TYPE[n.entity_type] ?? n.entity_type} · {timeAgo(n.created_at, now)}
                      {n.priority <= 2 && <span className="ml-1 font-semibold text-warning">· varias alertas</span>}
                    </p>
                    <Link href={href(n.entity_type, n.entity_id)} className="font-semibold hover:text-primary hover:underline">
                      {n.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">{n.reason}</p>
                  </div>
                  {!n.read_at && (
                    <form action={markNotificationRead}>
                      <input type="hidden" name="id" value={n.id} />
                      <button className="text-xs text-muted hover:text-text hover:underline" aria-label={`Marcar como leída: ${n.title}`}>
                        Leída
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              {prefs.data?.length ? "Sin notificaciones por ahora. Se generan al cargar datos nuevos que coinciden con tus alertas." : "Crea una alerta para empezar a recibir notificaciones."}
            </p>
          )}
        </section>
      </div>
    </>
  );
}

export default function AlertasPage() {
  return (
    <>
      <p className="eyebrow">Alertas tempranas</p>
      <h1 className="page-title">Vigila lo que te importa</h1>
      <p className="page-lead">
        Tus palabras clave se comparan con las noticias de los últimos 7 días y las licitaciones vigentes. Cada coincidencia genera una
        notificación (una por elemento, sin duplicados). Solo dentro de la aplicación; el correo es una extensión posterior.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Inbox />
      </Suspense>
    </>
  );
}
