import { toggleWatch } from "@/app/(app)/watchlist/actions";

export function WatchButton({ type, id, watching }: { type: "tender" | "instrument"; id: string; watching: boolean }) {
  return (
    <form action={toggleWatch}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <button
        aria-pressed={watching}
        className="rounded border border-line px-2 py-1 text-xs hover:bg-surface-2"
      >
        {watching ? "★ Siguiendo" : "☆ Seguir"}
      </button>
    </form>
  );
}
