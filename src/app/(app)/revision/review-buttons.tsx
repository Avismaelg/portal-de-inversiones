"use client";

import { useActionState } from "react";
import { publishInstrument, rejectInstrument, type ReviewResult } from "./actions";

export function ReviewButtons({ id, blocked }: { id: string; blocked: boolean }) {
  const [pub, pubAction, pubPending] = useActionState<ReviewResult | null, FormData>(publishInstrument, null);
  const [rej, rejAction, rejPending] = useActionState<ReviewResult | null, FormData>(rejectInstrument, null);
  const msg = pub ?? rej;
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <form action={pubAction}>
          <input type="hidden" name="id" value={id} />
          <button
            disabled={blocked || pubPending}
            className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-on-primary disabled:opacity-50"
          >
            {pubPending ? "Publicando…" : "Publicar"}
          </button>
        </form>
        <form action={rejAction}>
          <input type="hidden" name="id" value={id} />
          <button disabled={rejPending} className="rounded border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
            Rechazar
          </button>
        </form>
      </div>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-success" : "text-danger"}`}>
          {msg.message}
        </p>
      )}
    </div>
  );
}
