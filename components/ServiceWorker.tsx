"use client";

import { useEffect } from "react";

/**
 * Liga o service worker depois que a página carrega.
 *
 * Só em produção: em desenvolvimento ele serviria arquivo velho e faria você
 * perseguir mudança que já está no código mas não aparece na tela.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sem service worker o app funciona igual, só perde o modo offline.
      });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
