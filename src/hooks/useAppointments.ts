// ──────────────────────────────────────────────────────────────────────────────
//  VetLoop — useAppointments Hook
//
//  Bileşenlerde randevu verilerini yönetmek için hazır kullanım hook'u.
//  Loading, error ve data state'lerini kapsüller.
//
//  Kullanım örneği:
//    const { appointments, isLoading, error, refetch } = useMyAppointments();
//    const { appointments, isLoading } = useMyAppointments("Pending");
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import {
  getMyAppointments,
  getVetAppointments,
  cancelAppointment,
  updateAppointmentStatus,
} from "../services/appointmentService";
import type { AppointmentResponse, AppointmentStatus, UpdateAppointmentStatusRequest } from "../types/api";

interface UseAppointmentsResult {
  appointments: AppointmentResponse[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ── Pet Owner — kendi randevuları ─────────────────────────────────────────────
export function useMyAppointments(
  statusFilter?: AppointmentStatus,
): UseAppointmentsResult {
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyAppointments(statusFilter);
      setAppointments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Randevular yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { appointments, isLoading, error, refetch: fetch };
}

// ── Veterinarian — gelen randevular ──────────────────────────────────────────
export function useVetAppointments(
  statusFilter?: AppointmentStatus,
): UseAppointmentsResult {
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getVetAppointments(statusFilter);
      setAppointments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Randevular yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { appointments, isLoading, error, refetch: fetch };
}

// ── Randevu İptal ─────────────────────────────────────────────────────────────
export function useCancelAppointment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const cancel = async (id: string, onSuccess?: () => void) => {
    setIsLoading(true);
    setError(null);
    try {
      await cancelAppointment(id);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İptal işlemi başarısız.");
    } finally {
      setIsLoading(false);
    }
  };

  return { cancel, isLoading, error };
}

// ── Durum Güncelleme (Vet) ────────────────────────────────────────────────────
export function useUpdateAppointmentStatus() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const update = async (
    id: string,
    data: UpdateAppointmentStatusRequest,
    onSuccess?: (updated: AppointmentResponse) => void,
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await updateAppointmentStatus(id, data);
      onSuccess?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncelleme başarısız.");
    } finally {
      setIsLoading(false);
    }
  };

  return { update, isLoading, error };
}
