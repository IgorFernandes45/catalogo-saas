"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .catch(() => {
          // Development should never be blocked by offline support cleanup.
        });

      if ("caches" in window) {
        window.caches.keys()
          .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
          .catch(() => {
            // Cache cleanup is best-effort while testing on mobile devices.
          });
      }

      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is best-effort; the app still works online if registration fails.
    });
  }, []);

  return null;
}
