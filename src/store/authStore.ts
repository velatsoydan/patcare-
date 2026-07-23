// ──────────────────────────────────────────────────────────────────────────────
//  VetLoop — Zustand Auth Store
//
//  Uygulama genelinde kullanıcı kimlik durumunu yönetir:
//    • JWT token (localStorage'da kalıcı)
//    • Kullanıcı profili (id, ad, email, rol)
//    • isAuthenticated / isLoading flag'leri
//    • login / logout / restoreSession eylemleri
//
//  Neden Zustand? React Context'e göre avantajları:
//    • Provider sarma gerektirmez — herhangi bir bileşenden doğrudan erişilir
//    • Seçici subscription ile gereksiz re-render'lar engellenir
//    • persist middleware ile localStorage entegrasyonu tek satırlık
// ──────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";
import { tokenStorage } from "../lib/api";
import type { AuthResponse, UserRole } from "../types/api";

// ── JWT Payload Shape ─────────────────────────────────────────────────────────
interface JwtPayload {
  sub: string;               // userId
  email: string;
  name?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": UserRole;
  exp: number;               // Unix timestamp
}

// ── Store Shape ───────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
}

interface AuthState {
  // ── State ──────────────────────────────────────────────────────────────────
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  /** Called after a successful login/register API response. */
  login: (response: AuthResponse) => void;

  /** Clears all auth state and removes token from storage. */
  logout: () => void;

  /** Restores session from localStorage on app startup. */
  restoreSession: () => void;

  /** Updates the stored token (e.g. after token refresh). */
  setToken: (token: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseJwt(token: string): AuthUser | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);

    // Check expiry
    if (payload.exp * 1000 < Date.now()) return null;

    return {
      id:        payload.sub,
      email:     payload.email,
      fullName:  payload.name ?? payload.email,
      role:      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ── Initial State ───────────────────────────────────────────────────────
      user:            null,
      token:           null,
      isAuthenticated: false,
      isLoading:       false,

      // ── login ───────────────────────────────────────────────────────────────
      login: (response: AuthResponse) => {
        const user = parseJwt(response.token);
        if (!user) return; // Token decode başarısız — güvenli fallback

        // Raw token'ı storage'a yaz (interceptor buradan okur)
        tokenStorage.set(response.token);

        set({
          token:           response.token,
          user,
          isAuthenticated: true,
          isLoading:       false,
        });
      },

      // ── logout ──────────────────────────────────────────────────────────────
      logout: () => {
        tokenStorage.clear();
        set({
          token:           null,
          user:            null,
          isAuthenticated: false,
          isLoading:       false,
        });
      },

      // ── restoreSession ──────────────────────────────────────────────────────
      //  App mount'ta çağrılır. Storage'da token varsa decode edip doğrular.
      restoreSession: () => {
        const token = tokenStorage.get();
        if (!token) return;

        const user = parseJwt(token);
        if (!user) {
          // Token süresi dolmuş — temizle
          tokenStorage.clear();
          return;
        }

        set({ token, user, isAuthenticated: true });
      },

      // ── setToken ────────────────────────────────────────────────────────────
      setToken: (token: string) => {
        const user = parseJwt(token);
        if (!user) return;
        tokenStorage.set(token);
        set({ token, user, isAuthenticated: true });
      },
    }),
    {
      name:    "vetloop-auth",           // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Sadece token'ı persist et — user runtime'da JWT'den re-derive edilir
      partialize: (state) => ({ token: state.token }),
    },
  ),
);

// ── Selector Hooks (re-render optimizasyonu) ──────────────────────────────────
/** Mevcut kullanıcı nesnesini döner. */
export const useCurrentUser = () => useAuthStore((s) => s.user);

/** Kullanıcının rolünü kontrol eder. */
export const useRole = () => useAuthStore((s) => s.user?.role);

/** Kullanıcının veteriner olup olmadığını döner. */
export const useIsVet = () => useAuthStore((s) => s.user?.role === "Veterinarian");

/** Kullanıcının admin olup olmadığını döner. */
export const useIsAdmin = () => useAuthStore((s) => s.user?.role === "Admin");

/** Auth yükleniyor mu? */
export const useIsLoading = () => useAuthStore((s) => s.isLoading);
