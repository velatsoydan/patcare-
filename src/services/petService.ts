// ──────────────────────────────────────────────────────────────────────────────
//  VetLoop — Pet Service
//  PetsController CRUD endpoint'lerini çağırır.
// ──────────────────────────────────────────────────────────────────────────────

import api from "../lib/api";
import type { PetResponse, CreatePetRequest, UpdatePetRequest } from "../types/api";

/** Oturum açan kullanıcının tüm evcil hayvanlarını listeler. */
export async function getMyPets(): Promise<PetResponse[]> {
  const response = await api.get<PetResponse[]>("/pets");
  return response.data;
}

/** Belirli bir evcil hayvanın detaylarını getirir. */
export async function getPetById(id: string): Promise<PetResponse> {
  const response = await api.get<PetResponse>(`/pets/${id}`);
  return response.data;
}

/** Yeni evcil hayvan kaydeder. */
export async function createPet(data: CreatePetRequest): Promise<PetResponse> {
  const response = await api.post<PetResponse>("/pets", data);
  return response.data;
}

/** Evcil hayvan bilgilerini günceller. */
export async function updatePet(id: string, data: UpdatePetRequest): Promise<PetResponse> {
  const response = await api.put<PetResponse>(`/pets/${id}`, data);
  return response.data;
}

/** Evcil hayvanı soft-delete ile siler (204 No Content döner). */
export async function deletePet(id: string): Promise<void> {
  await api.delete(`/pets/${id}`);
}
