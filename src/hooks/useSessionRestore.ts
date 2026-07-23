// ──────────────────────────────────────────────────────────────────────────────
//  VetLoop — Auth Session Bootstrap Hook
//
//  Uygulama ilk yüklendiğinde çağrılır.
//  localStorage'daki token'ı kontrol eder:
//    • Token geçerliyse → Zustand store'a restore eder (sessiz)
//    • Token süresi dolmuşsa → temizler
//    • Token yoksa → hiçbir şey yapmaz
//
//  Kullanım: main.tsx veya AppShell'in en üst seviyesinde çağır.
//  import { useSessionRestore } from "../hooks/useSessionRestore";
//  useSessionRestore(); // bileşen mount'unda bir kez çalışır
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

export function useSessionRestore(): void {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    // App başlangıcında localStorage'dan oturumu restore et
    restoreSession();

    // Axios interceptor'ın dispatch ettiği logout event'ini dinle
    const handleLogout = () => useAuthStore.getState().logout();
    window.addEventListener("vetloop:logout", handleLogout);

    return () => {
      window.removeEventListener("vetloop:logout", handleLogout);
    };
  }, [restoreSession]);
}
