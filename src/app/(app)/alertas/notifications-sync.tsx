"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { syncMyNotifications } from "./actions";

/** Al abrir la bandeja, busca coincidencias nuevas una vez y refresca si hubo altas. */
export function NotificationsSync() {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    syncMyNotifications().then((n) => {
      if (n > 0) router.refresh();
    });
  }, [router]);
  return null;
}
