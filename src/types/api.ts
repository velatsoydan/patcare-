// ──────────────────────────────────────────────────────────────────────────────
//  VetLoop — Shared API Types
//  Single source of truth for all backend DTO shapes.
//  Mirrors the C# records in VetLoop.API/DTOs exactly.
// ──────────────────────────────────────────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole =
  | "PetOwner"
  | "FarmOwner"
  | "Veterinarian"
  | "Admin";

export type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "Completed"
  | "Cancelled";

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  phoneNumber?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  /** Google ID token from web / mobile Google Sign-In */
  idToken: string;
}

export interface AppleAuthRequest {
  /** Apple Identity token from Apple Sign-In */
  idToken: string;
  user?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
    email?: string;
  };
}

/** JWT envelope returned by /api/auth/register, /login, /google */
export interface AuthResponse {
  token: string;
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  expiresAt: string; // ISO-8601
}

// ── Pets ──────────────────────────────────────────────────────────────────────

export interface PetResponse {
  id: string;
  name: string;
  species: string;
  breed: string;
  dateOfBirth: string;   // ISO-8601
  gender: string;
  weightKg: number;
  bloodType?: string;
  allergies?: string;
  iotCollarMacAddress?: string;
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePetRequest {
  name: string;
  species: string;
  breed: string;
  dateOfBirth: string;
  gender: string;
  weightKg: number;
  bloodType?: string;
  allergies?: string;
  iotCollarMacAddress?: string;
}

export interface UpdatePetRequest extends CreatePetRequest {}

// ── Farms ─────────────────────────────────────────────────────────────────────

export interface FarmResponse {
  id: string;
  name: string;
  location: string;
  livestockCount: number;
  farmType: string;
  taxNumber?: string;
  contactPersonName?: string;
  primaryGatewayId?: string;
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Vets ──────────────────────────────────────────────────────────────────────

export interface VetProfileResponse {
  id: string;
  licenseNumber: string;
  clinicAddress: string;
  specialty: string;
  consultationFee: number;
  isAvailableForEmergency: boolean;
  userId: string;
  vetFullName: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Appointments ──────────────────────────────────────────────────────────────

export interface AppointmentResponse {
  id: string;
  petId: string;
  petName: string;
  vetProfileId: string;
  vetFullName: string;
  scheduledAt: string;     // ISO-8601 UTC
  durationMinutes: number;
  status: AppointmentStatus;
  reason?: string;
  vetNotes?: string;
  finalFee?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateAppointmentRequest {
  petId: string;
  vetProfileId: string;
  scheduledAt: string;     // ISO-8601 UTC
  durationMinutes: number;
  reason?: string;
}

export interface UpdateAppointmentStatusRequest {
  newStatus: AppointmentStatus;
  vetNotes?: string;
  finalFee?: number;
}

// ── AI Diagnostics ────────────────────────────────────────────────────────────

export interface AiDiagnosticRequest {
  symptoms: string;
  petId?: string;
}

export interface AiDiagnosticResponse {
  diagnosis: string;
  urgencyLevel: "Low" | "Medium" | "High" | "Critical";
  recommendations: string[];
}

// ── Common ────────────────────────────────────────────────────────────────────

/** Standard error envelope from GlobalExceptionHandlerMiddleware */
export interface ApiError {
  error: string;
  message: string;
  detail?: string;
  traceId: string;
}
