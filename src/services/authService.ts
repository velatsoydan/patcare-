// ──────────────────────────────────────────────────────────────────────────────
//  VetLoop — Auth Service
//  /api/auth endpoint'lerini çağırır ve AuthStore'u günceller.
// ──────────────────────────────────────────────────────────────────────────────

import api from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type {
  LoginRequest,
  RegisterRequest,
  GoogleAuthRequest,
  AppleAuthRequest,
  AuthResponse,
} from "../types/api";

// ── register ──────────────────────────────────────────────────────────────────
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/register", data);
  useAuthStore.getState().login(response.data);
  return response.data;
}

// ── login ─────────────────────────────────────────────────────────────────────
export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", data);
  useAuthStore.getState().login(response.data);
  return response.data;
}

// ── googleLogin ───────────────────────────────────────────────────────────────
//  Expo/Web Google OAuth'dan gelen ID token'ı backend'e gönderir.
//  Backend Google.Apis.Auth ile doğrular ve JWT döner.
export async function googleLogin(data: GoogleAuthRequest): Promise<AuthResponse> {
  try {
    const response = await api.post<AuthResponse>("/auth/google", data);
    if (response.data) {
      useAuthStore.getState().login(response.data);
    }
    return response.data;
  } catch (error: any) {
    console.error("Google Login API Hatası:", error);
    throw error;
  }
}

// ── appleLogin ────────────────────────────────────────────────────────────────
//  Apple Sign-In'den gelen Identity token'ı backend'e gönderir.
export async function appleLogin(data: AppleAuthRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/apple", data);
  useAuthStore.getState().login(response.data);
  return response.data;
}

// ── logout ────────────────────────────────────────────────────────────────────
export function logout(): void {
  useAuthStore.getState().logout();
}
