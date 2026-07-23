// ──────────────────────────────────────────────────────────────────────────────
//  VetLoop — Appointment Service
//
//  AppointmentsController'daki 6 endpoint'i birebir karşılayan frontend
//  fonksiyonları. Her fonksiyon:
//    • Axios API client kullanır (JWT interceptor otomatik devrede)
//    • TypeScript tipleri ile tam type-safety sağlar
//    • Hata yönetimini çağıran katmana bırakır (try/catch UI'da yapılır)
// ──────────────────────────────────────────────────────────────────────────────

import api from "../lib/api";
import type {
  AppointmentResponse,
  AppointmentStatus,
  CreateAppointmentRequest,
  UpdateAppointmentStatusRequest,
} from "../types/api";

// ── GET /api/appointments/my ──────────────────────────────────────────────────
/**
 * Oturum açmış hayvan sahibinin tüm randevularını getirir.
 * @param status - Opsiyonel status filtresi (örn. "Pending", "Confirmed")
 */
export async function getMyAppointments(
  status?: AppointmentStatus,
): Promise<AppointmentResponse[]> {
  const params = status ? { status } : undefined;
  const response = await api.get<AppointmentResponse[]>("/appointments/my", { params });
  return response.data;
}

// ── GET /api/appointments/vet ─────────────────────────────────────────────────
/**
 * Oturum açmış veterinere atanmış tüm randevuları getirir.
 * Sadece Veterinarian rolündeki kullanıcılar çağırabilir.
 * @param status - Opsiyonel status filtresi
 */
export async function getVetAppointments(
  status?: AppointmentStatus,
): Promise<AppointmentResponse[]> {
  const params = status ? { status } : undefined;
  const response = await api.get<AppointmentResponse[]>("/appointments/vet", { params });
  return response.data;
}

// ── GET /api/appointments/{id} ────────────────────────────────────────────────
/**
 * Tek bir randevunun detaylarını getirir.
 * Hem hayvan sahibi hem de atanmış veteriner erişebilir.
 * @param id - Randevu UUID'si
 */
export async function getAppointmentById(id: string): Promise<AppointmentResponse> {
  const response = await api.get<AppointmentResponse>(`/appointments/${id}`);
  return response.data;
}

// ── POST /api/appointments ────────────────────────────────────────────────────
/**
 * Hayvan sahibi adına yeni bir randevu oluşturur.
 * Randevu "Pending" statüsüyle başlar — vet onayı beklenir.
 *
 * @example
 * const appointment = await createAppointment({
 *   petId: "pet-uuid",
 *   vetProfileId: "vet-profile-uuid",
 *   scheduledAt: new Date(Date.now() + 86400000).toISOString(), // yarın
 *   durationMinutes: 30,
 *   reason: "Aşılama randevusu",
 * });
 */
export async function createAppointment(
  data: CreateAppointmentRequest,
): Promise<AppointmentResponse> {
  const response = await api.post<AppointmentResponse>("/appointments", data);
  return response.data;
}

// ── PUT /api/appointments/{id}/status ────────────────────────────────────────
/**
 * Randevu yaşam döngüsü durumunu günceller.
 * Sadece atanmış veteriner çağırabilir.
 *
 * Geçerli geçişler:
 *   Pending   → Confirmed | Cancelled
 *   Confirmed → Completed | Cancelled
 *
 * @param id      - Randevu UUID'si
 * @param data    - Yeni status, vet notları ve nihai ücret
 */
export async function updateAppointmentStatus(
  id: string,
  data: UpdateAppointmentStatusRequest,
): Promise<AppointmentResponse> {
  const response = await api.put<AppointmentResponse>(`/appointments/${id}/status`, data);
  return response.data;
}

// ── DELETE /api/appointments/{id} ────────────────────────────────────────────
/**
 * Bir randevuyu iptal eder (soft-delete).
 * Hem hayvan sahibi hem de veteriner iptal edebilir.
 * Tamamlanmış (Completed) randevular iptal edilemez.
 *
 * @param id - Randevu UUID'si
 */
export async function cancelAppointment(id: string): Promise<void> {
  await api.delete(`/appointments/${id}`);
}

// ── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────

/**
 * Status değerini Türkçe etikete çevirir — UI'da gösterim için.
 */
export function getStatusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    Pending:   "Onay Bekliyor",
    Confirmed: "Onaylandı",
    Completed: "Tamamlandı",
    Cancelled: "İptal Edildi",
  };
  return labels[status];
}

/**
 * Status'a göre renk sınıfını döner — Badge/Badge bileşeni için.
 */
export function getStatusColor(status: AppointmentStatus): string {
  const colors: Record<AppointmentStatus, string> = {
    Pending:   "bg-amber-100 text-amber-700 border-amber-200",
    Confirmed: "bg-blue-100 text-blue-700 border-blue-200",
    Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return colors[status];
}
