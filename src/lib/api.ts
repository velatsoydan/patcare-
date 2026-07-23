// ──────────────────────────────────────────────────────────────────────────────
//  VetLoop — Merkezi Axios API Client
//
//  Mimari kararlar:
//    • Tek Axios instance — tüm servisler bunu kullanır, base URL tek yerden yönetilir.
//    • Request interceptor — her istekte token'ı Authorization header'ına otomatik ekler.
//    • Response interceptor — 401 geldiğinde token'ı temizler ve login'e yönlendirir.
//    • Token storage — localStorage (web) veya AsyncStorage (RN) arası soyutlama.
// ──────────────────────────────────────────────────────────────────────────────

import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiError } from "../types/api";

// ── Ortam bazlı base URL ──────────────────────────────────────────────────────
//  Vite: VITE_API_URL env variable'ı kullan.
//  Expo: process.env.EXPO_PUBLIC_API_URL kullan (ayrı dosyada override et).
const BASE_URL =
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ??
  "http://localhost:5166/api";  // .NET dev server default

// ── Token Storage Soyutlama ───────────────────────────────────────────────────
//  Web için localStorage, React Native için AsyncStorage kullanılır.
//  Bu dosyayı değiştirmeden storage katmanını swap edebilirsin.
export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem("vetloop_token");
  },
  set(token: string): void {
    localStorage.setItem("vetloop_token", token);
  },
  clear(): void {
    localStorage.removeItem("vetloop_token");
    localStorage.removeItem("vetloop_user");
  },
};

// ── Axios Instance ────────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,          // 15 saniye — yavaş mobil bağlantılar için
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request Interceptor — JWT Token Enjeksiyonu ───────────────────────────────
//  Her giden istekte storage'dan token'ı alır ve Bearer header'a ekler.
//  Token yoksa header eklenmez (public endpoint'ler için doğru davranış).
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor — Hata Normalizasyonu + 401 Handler ─────────────────
api.interceptors.response.use(
  // Başarılı yanıtlar doğrudan geçer
  (response) => response,

  // Hata yanıtları normalize edilir
  async (error: AxiosError<ApiError>) => {
    const status = error.response?.status;

    // 401 Unauthorized: token süresi dolmuş veya geçersiz
    if (status === 401) {
      tokenStorage.clear();
      // Auth store'u sıfırla — circular import'u önlemek için window event kullan
      window.dispatchEvent(new CustomEvent("vetloop:logout"));
    }

    // Backend'den gelen standart veya validation hata mesajlarını normalize et
    const apiError = error.response?.data as any;
    let message = apiError?.message ?? apiError?.error;

    // FluentValidation / ASP.NET Core ValidationProblemDetails support
    if (!message && apiError?.errors && typeof apiError.errors === "object") {
      const errorList: string[] = [];
      for (const key of Object.keys(apiError.errors)) {
        const val = apiError.errors[key];
        if (Array.isArray(val)) {
          errorList.push(...val);
        } else if (typeof val === "string") {
          errorList.push(val);
        }
      }
      if (errorList.length > 0) {
        message = errorList.join(" | ");
      }
    }

    if (!message) {
      message = apiError?.title ?? error.message ?? "An unexpected error occurred.";
    }

    // Error nesnesine backend traceId'yi ekle (hata takibi için)
    const enrichedError = new Error(message) as Error & {
      traceId?: string;
      status?: number;
      errorCode?: string;
    };
    enrichedError.traceId  = apiError?.traceId;
    enrichedError.status   = status;
    enrichedError.errorCode = apiError?.error;

    return Promise.reject(enrichedError);
  },
);

export default api;
