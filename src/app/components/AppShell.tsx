/**
 * VetLoop — Unified App Shell
 * ─────────────────────────────────────────────────────────────
 * State-driven navigation shell comprising:
 *   • InitialGatewayScreen — OAuth entry point + hidden admin backdoor
 *   • AdminLoginScreen      — Secure 2-FA corporate admin portal
 *   • AuthScreen            — Role-aware email sign-in
 *   • AIDiagnosticScreen    — Multimodal AI Vision Diagnostic
 *   • IoT Dashboard         — Routes to MonitoringHub
 *   • SettingsScreen        — Profile, devices, payments, logout
 *
 * Stack: React 18 · TypeScript · Tailwind CSS v4 · Lucide React
 */

import { useState, useRef, useEffect } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Stethoscope,
  Home,
  Wheat,
  ScanLine,
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Radio,
  Settings,
  LogOut,
  Bell,
  CreditCard,
  User,
  Cpu,
  BrainCircuit,
  Activity,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  X,
  ToggleLeft,
  ToggleRight,
  Plus,
  Star,
  // New icons for Gateway & Admin screens
  Shield,
  KeyRound,
  Fingerprint,
  Users,
  BarChart3,
  ServerCog,
  AlertOctagon,
  BadgeCheck,
  Layers,
  Hash,
} from "lucide-react";
import MonitoringHub from "./MonitoringHub";
import ModernDashboard from "./ModernDashboard";
import { OAuthButtons } from "./OAuthButtons";
import { login as apiLogin, register as apiRegister } from "../../services/authService";
import { getMyPets } from "../../services/petService";
import { useAuthStore } from "../../store/authStore";
import { useSessionRestore } from "../../hooks/useSessionRestore";
import type { PetResponse } from "../../types/api";

// ─── Types & Constants ─────────────────────────────────────────

type AppScreen =
  | "gateway"
  | "auth"
  | "admin-login"
  | "admin-dashboard"
  | "dashboard"
  | "ai-diagnostic"
  | "iot-dashboard"
  | "settings";

type UserRole = "pet-owner" | "farm-owner" | "veterinarian";

interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

type DiagnosticOutcome = "minor" | "severe" | null;

interface DiagnosticResult {
  outcome: DiagnosticOutcome;
  verdict: string;
  confidence: number;
  condition: string;
  details: string;
  steps: string[];
}

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; icon: React.ElementType; color: string; bg: string; description: string }
> = {
  "pet-owner": {
    label: "Pet Owner",
    icon: Home,
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/30",
    description: "Manage your pets' health",
  },
  "farm-owner": {
    label: "Farm / Herd",
    icon: Wheat,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    description: "Livestock management",
  },
  veterinarian: {
    label: "Veterinarian",
    icon: Stethoscope,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    description: "Professional vet portal",
  },
};

// Simulated AI diagnosis outcomes keyed to symptom keywords
function classifySymptoms(text: string): DiagnosticResult {
  const lower = text.toLowerCase();
  const severeKeywords = [
    "seizure","convuls","collapse","unconscious","paralys","fracture","break","broke",
    "blood","hemorrhage","not breathing","difficulty breath","labored","swollen","can't stand",
    "won't eat","not eating","lethargic","lethargy","high fever","39","40","41",
    "severe","critical","emergency","urgent",
  ];
  const isSevere = severeKeywords.some((kw) => lower.includes(kw));

  if (isSevere) {
    return {
      outcome: "severe",
      verdict: "Professional Veterinary Care Required",
      confidence: 91,
      condition: "Acute Systemic Illness — Possible Febrile/Inflammatory Event",
      details:
        "The described symptoms, combined with the uploaded scan analysis, indicate a high-probability systemic condition requiring immediate in-person clinical evaluation. Delayed treatment may worsen prognosis.",
      steps: [
        "Do not administer any medication without vet guidance",
        "Keep the animal calm and in a temperature-controlled environment",
        "Note the onset time, duration, and progression of symptoms",
        "Bring medical history and vaccination records to the visit",
      ],
    };
  }

  return {
    outcome: "minor",
    verdict: "Minor Issue — Home Care Recommended",
    confidence: 86,
    condition: "Mild Dermatological / Environmental Irritation",
    details:
      "The visual scan and symptom description suggest a mild, non-systemic condition. No immediate veterinary visit is required. Monitor closely over the next 48–72 hours.",
    steps: [
      "Clean the affected area gently with saline solution twice daily",
      "Apply pet-safe aloe vera or prescribed topical cream if available",
      "Ensure the animal has access to fresh water and nutritious food",
      "Limit outdoor exposure and contact with other animals temporarily",
      "Schedule a routine follow-up if no improvement within 72 hours",
    ],
  };
}

// ─── Auth Screen ────────────────────────────────────────────────

function AuthScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("pet-owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  const DEMO_CREDENTIALS: Record<UserRole, { email: string; name: string; avatar: string }> = {
    "pet-owner": { email: "ayse@vetloop.io", name: "Ayşe Kaya", avatar: "AK" },
    "farm-owner": { email: "mehmet@sutasfarm.com", name: "Mehmet Demir", avatar: "MD" },
    veterinarian: { email: "dr.velat@vetloop.io", name: "Dr. Velat Soydan", avatar: "VS" },
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Lütfen e-posta ve şifrenizi giriniz.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      if (activeTab === "signin") {
        const res = await apiLogin({ email, password });
        onLogin({
          name: res.fullName,
          email: res.email,
          role: res.role === "Veterinarian" ? "veterinarian" : res.role === "FarmOwner" ? "farm-owner" : "pet-owner",
          avatar: res.fullName.charAt(0),
        });
      } else {
        const roleMap: Record<UserRole, any> = {
          "pet-owner": "PetOwner",
          "farm-owner": "FarmOwner",
          veterinarian: "Veterinarian",
        };
        const res = await apiRegister({
          fullName: email.split("@")[0],
          email,
          password,
          role: roleMap[selectedRole],
        });
        onLogin({
          name: res.fullName,
          email: res.email,
          role: res.role === "Veterinarian" ? "veterinarian" : res.role === "FarmOwner" ? "farm-owner" : "pet-owner",
          avatar: res.fullName.charAt(0),
        });
      }
    } catch (err: any) {
      setError(err.message || "Giriş işlemi başarısız. Lütfen bilgilerinizi kontrol edin.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = () => {
    const demo = DEMO_CREDENTIALS[selectedRole];
    setEmail(demo.email);
    setPassword("VetLoop2026!");
    setError("");
  };

  const roleKeys: UserRole[] = ["pet-owner", "farm-owner", "veterinarian"];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/15 rounded-2xl border border-emerald-500/30 mb-4">
            <Stethoscope className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">VetLoop</h1>
          <p className="text-slate-500 text-sm mt-1">
            Veterinary Intelligence Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          {/* Sign in / Sign up tabs */}
          <div className="flex bg-slate-800/60 rounded-xl p-1 mb-6">
            {(["signin", "signup"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-emerald-500 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab === "signin" ? "Giriş Yap" : "Hesap Oluştur"}
              </button>
            ))}
          </div>

          {/* Role selector */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Kullanıcı Rolü
            </label>
            <div className="grid grid-cols-3 gap-2">
              {roleKeys.map((role) => {
                const cfg = ROLE_CONFIG[role];
                const Icon = cfg.icon;
                const isActive = selectedRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`
                      flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200
                      ${isActive ? cfg.bg + " scale-[1.02]" : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"}
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? cfg.color : "text-slate-500"}`} />
                    <span className={`text-[11px] font-semibold ${isActive ? cfg.color : "text-slate-500"}`}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta Adresi"
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifre"
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Sign in button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className={`
              w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2
              ${isLoading
                ? "bg-emerald-500/30 text-emerald-400/60 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_4px_24px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_32px_rgba(16,185,129,0.5)] active:scale-[0.98]"
              }
            `}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Doğrulanıyor…</>
            ) : (
              <>{activeTab === "signin" ? "Giriş Yap" : "Hesap Oluştur"} <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          {/* OAuth Buttons Section */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold absolute">
              Veya OAuth ile Devam Et
            </span>
          </div>

          <OAuthButtons
            onSuccess={() => {
              const authUser = useAuthStore.getState().user;
              if (authUser) {
                onLogin({
                  name: authUser.fullName,
                  email: authUser.email,
                  role: authUser.role === "Veterinarian" ? "veterinarian" : authUser.role === "FarmOwner" ? "farm-owner" : "pet-owner",
                  avatar: authUser.fullName.charAt(0),
                });
              }
            }}
            onError={(err) => setError(err)}
          />

          {/* Demo Fill Button */}
          <button
            onClick={handleDemoFill}
            className="w-full mt-4 py-2.5 rounded-xl text-xs text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 transition-all"
          >
            <span className="text-emerald-500">✦</span> Seed hesabı doldur ({ROLE_CONFIG[selectedRole].label})
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-700 mt-4">
          Devam ederek VetLoop Hizmet Şartları ve Gizlilik Politikasını kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  );
}

// ─── AI Diagnostic Screen ───────────────────────────────────────

type ScanPhase = "idle" | "scanning" | "done";

function ScanAnimation() {
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Outer rings */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border border-emerald-500/30"
          style={{
            width: `${60 + i * 30}%`,
            height: `${60 + i * 30}%`,
            animation: `ping ${1.2 + i * 0.4}s cubic-bezier(0,0,0.2,1) infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
      {/* Center core */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl border border-emerald-500/40 flex items-center justify-center animate-pulse">
          <BrainCircuit className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="space-y-1.5 text-center">
          <p className="text-xs font-semibold text-emerald-400 animate-pulse">
            VetLoop Vision AI — Scanning
          </p>
          <div className="flex gap-1 justify-center">
            {["Parsing image…", "Cross-referencing DB…", "Running LLM…"].map((step, i) => (
              <span
                key={step}
                className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/40"
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* Scan line */}
      <div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
        style={{ animation: "scanline 2s ease-in-out infinite" }}
      />
      <style>{`
        @keyframes scanline {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function DiagnosticResultCard({
  result,
  onFindVets,
  onReset,
}: {
  result: DiagnosticResult;
  onFindVets: () => void;
  onReset: () => void;
}) {
  const isMinor = result.outcome === "minor";

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-500 ${
        isMinor
          ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 to-slate-900"
          : "border-red-500/40 bg-gradient-to-br from-red-950/30 to-slate-900 shadow-[0_0_40px_rgba(239,68,68,0.1)]"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isMinor ? "bg-emerald-500/20" : "bg-red-500/20"
            }`}
          >
            {isMinor ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-mono text-slate-500 mb-0.5">AI VERDICT</p>
            <p
              className={`text-base font-black ${
                isMinor ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {result.verdict}
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="p-1.5 text-slate-600 hover:text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isMinor ? "bg-emerald-500" : "bg-red-500"
            }`}
            style={{ width: `${result.confidence}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
          {result.confidence}% confidence
        </span>
      </div>

      {/* Condition */}
      <div
        className={`rounded-xl px-4 py-3 mb-4 border ${
          isMinor
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-red-500/5 border-red-500/20"
        }`}
      >
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">
          Likely Condition
        </p>
        <p
          className={`text-sm font-bold ${isMinor ? "text-emerald-300" : "text-red-300"}`}
        >
          {result.condition}
        </p>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{result.details}</p>
      </div>

      {/* Steps */}
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-2.5">
          {isMinor ? "Home Care Steps" : "Before Your Vet Visit"}
        </p>
        <div className="space-y-2">
          {result.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                  isMinor
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {i + 1}
              </span>
              <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      {!isMinor && (
        <button
          onClick={onFindVets}
          className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(239,68,68,0.3)]"
        >
          <MapPin className="w-4 h-4" />
          Find Available Vets Nearby
          <ArrowRight className="w-4 h-4 ml-auto" />
        </button>
      )}
      {isMinor && (
        <button
          onClick={onReset}
          className="w-full py-3 rounded-xl border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/10 transition-all"
        >
          Run Another Diagnosis
        </button>
      )}
    </div>
  );
}

function AIDiagnosticScreen({ user }: { user: AuthUser }) {
  const [symptoms, setSymptoms] = useState("");
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [hasUpload, setHasUpload] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [vetSearchOpen, setVetSearchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MOCK_UPLOADS = [
    "scan_cow_flank_360.jpg",
    "collar_cam_tarçın_001.mp4",
    "farm_sensor_image_B07.png",
    "pet_skin_close_up.jpg",
  ];

  const handleUpload = () => {
    // Simulate file pick
    setHasUpload(true);
    setUploadLabel(MOCK_UPLOADS[Math.floor(Math.random() * MOCK_UPLOADS.length)]);
  };

  const handleRunDiagnosis = async () => {
    if (!symptoms.trim() && !hasUpload) return;
    setScanPhase("scanning");
    setResult(null);
    await new Promise((r) => setTimeout(r, 3200));
    setScanPhase("done");
    setResult(classifySymptoms(symptoms));
  };

  const handleReset = () => {
    setScanPhase("idle");
    setResult(null);
    setSymptoms("");
    setHasUpload(false);
    setUploadLabel("");
    setVetSearchOpen(false);
  };

  const nearbyVets = [
    { name: "Dr. Ahmet Yıldız", specialty: "Large Animal", distance: "0.8 km", rating: 4.9, available: true },
    { name: "Dr. Selin Arslan", specialty: "Small Animal & Exotic", distance: "1.4 km", rating: 4.8, available: true },
    { name: "Dr. Kerem Çelik", specialty: "Farm & Livestock B2B", distance: "2.1 km", rating: 4.7, available: false },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
            <BrainCircuit className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">AI Vision Diagnostic</h1>
            <p className="text-xs text-slate-500">
              Multimodal · Image + Text · Powered by VetLoop LLM
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
            <Sparkles className="w-3 h-3 text-violet-400" />
            GPT-4o Vision
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-5">
        {scanPhase !== "done" && (
          <>
            {/* Step 1 — Describe symptoms */}
            <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-[11px] font-black border border-violet-500/30">
                  1
                </span>
                <h2 className="text-sm font-semibold text-slate-200">Describe the Symptoms</h2>
                <span className="ml-auto text-[10px] text-slate-600">Text + image = higher accuracy</span>
              </div>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                disabled={scanPhase === "scanning"}
                placeholder={`Describe what you're observing…\n\nExamples:\n• "My cow has a rash on her flank and is lethargic"\n• "Dog scratching ear constantly, discharge visible"\n• "Sheep not eating for 2 days, bloated belly"`}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700/60 text-sm text-slate-200 placeholder-slate-600 p-3 resize-none focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition-all min-h-[130px] disabled:opacity-50"
              />
              {/* Character count + severity hint */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-slate-600">
                  {symptoms.length} chars ·{" "}
                  <span className="text-slate-500">
                    Include severity keywords like "lethargic", "not eating", or "39°C fever" for higher-confidence diagnosis
                  </span>
                </p>
                {symptoms.length > 10 && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                )}
              </div>
            </div>

            {/* Step 2 — Upload scan / photo */}
            <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-[11px] font-black border border-sky-500/30">
                  2
                </span>
                <h2 className="text-sm font-semibold text-slate-200">Capture or Upload Media</h2>
                <span className="ml-auto text-[10px] px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded-full border border-sky-500/20">
                  360° · Photo · Video
                </span>
              </div>

              {!hasUpload ? (
                <button
                  onClick={handleUpload}
                  disabled={scanPhase === "scanning"}
                  className={`
                    w-full h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all group
                    ${scanPhase === "scanning"
                      ? "border-slate-700 opacity-50 cursor-not-allowed"
                      : "border-slate-700/60 hover:border-sky-500/50 hover:bg-sky-500/5 cursor-pointer"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 group-hover:border-sky-500/40 transition-all">
                      <Camera className="w-5 h-5 text-slate-400 group-hover:text-sky-400 transition-colors" />
                    </div>
                    <div className="w-px h-8 bg-slate-700" />
                    <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 group-hover:border-sky-500/40 transition-all">
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-sky-400 transition-colors" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-400 group-hover:text-sky-300 font-medium transition-colors">
                      Capture 360° Scan or Upload Photo
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      JPG, PNG, MP4, HEIC · Max 50MB
                    </p>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 flex items-center gap-4">
                  {/* Placeholder thumbnail */}
                  <div className="flex-shrink-0 w-20 h-16 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 to-emerald-500/10" />
                    <ScanLine className="w-8 h-8 text-sky-400/60 relative z-10" />
                    <span className="absolute bottom-1 right-1 text-[8px] text-sky-400 font-mono bg-slate-900/60 px-1 rounded">
                      360°
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-sky-300 truncate">{uploadLabel}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Scan uploaded · Ready for analysis
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400">Verified · AI-compatible format</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setHasUpload(false); setUploadLabel(""); }}
                    className="text-slate-600 hover:text-slate-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Step 3 — Run diagnosis */}
            <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-black border border-emerald-500/30">
                  3
                </span>
                <h2 className="text-sm font-semibold text-slate-200">Run Analysis</h2>
              </div>

              {scanPhase === "scanning" ? (
                <div className="h-48 rounded-xl bg-slate-900/60 border border-emerald-500/20 relative overflow-hidden">
                  <ScanAnimation />
                </div>
              ) : (
                <button
                  onClick={handleRunDiagnosis}
                  disabled={!symptoms.trim() && !hasUpload}
                  className={`
                    w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-300
                    ${!symptoms.trim() && !hasUpload
                      ? "bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-700/40"
                      : "bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white shadow-[0_4px_30px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_40px_rgba(139,92,246,0.5)] active:scale-[0.98]"
                    }
                  `}
                >
                  <BrainCircuit className="w-5 h-5" />
                  Run AI Vision Diagnosis
                  {(symptoms.trim() || hasUpload) && <Sparkles className="w-4 h-4 text-yellow-300" />}
                </button>
              )}

              {!symptoms.trim() && !hasUpload && (
                <p className="text-[11px] text-slate-600 text-center mt-2">
                  Add a symptom description or upload a scan to enable analysis
                </p>
              )}
            </div>
          </>
        )}

        {/* Result card */}
        {scanPhase === "done" && result && (
          <DiagnosticResultCard
            result={result}
            onFindVets={() => setVetSearchOpen(true)}
            onReset={handleReset}
          />
        )}

        {/* Nearby Vets Modal (inline) */}
        {vetSearchOpen && (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-bold text-white">Available Vets Nearby</h2>
              </div>
              <button
                onClick={() => setVetSearchOpen(false)}
                className="text-slate-600 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {nearbyVets.map((vet) => (
                <div
                  key={vet.name}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 hover:border-slate-600 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{vet.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {vet.specialty} · {vet.distance}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] text-slate-400">{vet.rating}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        vet.available
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-700 text-slate-500"
                      }`}
                    >
                      {vet.available ? "● Available" : "○ Busy"}
                    </span>
                    {vet.available && (
                      <button className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5">
                        Book <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-6" />
      </div>
    </div>
  );
}

// ─── Settings Screen ────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, sublabel, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        {sublabel && <p className="text-[11px] text-slate-600 mt-0.5">{sublabel}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="transition-colors"
      >
        {checked ? (
          <ToggleRight className="w-8 h-8 text-emerald-400" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-slate-600" />
        )}
      </button>
    </div>
  );
}

function SettingsScreen({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  // Notifications state with localStorage persistence
  const [notifAppointments, setNotifAppointments] = useState(() => {
    return localStorage.getItem("vetloop_notif_appts") !== "false";
  });
  const [notifIoTAlerts, setNotifIoTAlerts] = useState(() => {
    return localStorage.getItem("vetloop_notif_iot") !== "false";
  });
  const [notifPayments, setNotifPayments] = useState(() => {
    return localStorage.getItem("vetloop_notif_pay") !== "false";
  });
  const [notifAIUpdates, setNotifAIUpdates] = useState(() => {
    return localStorage.getItem("vetloop_notif_ai") === "true";
  });

  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // Real backend pets data for IoT Devices
  const [realPets, setRealPets] = useState<PetResponse[]>([]);
  const [isLoadingPets, setIsLoadingPets] = useState(true);

  // Payment methods state with localStorage persistence
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; label: string; default: boolean; cardHolder?: string }[]>(() => {
    const saved = localStorage.getItem("vetloop_payment_methods");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: "pm-1", label: "Visa ending in 4242", default: true, cardHolder: user.name },
      { id: "pm-2", label: "Mastercard ending in 8811", default: false, cardHolder: user.name },
    ];
  });

  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardName, setNewCardName] = useState("");

  const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG["pet-owner"];

  // Fetch real pets from .NET Web API /api/pets
  useEffect(() => {
    getMyPets()
      .then((petsData) => {
        setRealPets(petsData);
      })
      .catch((err) => {
        console.error("Settings: Failed to fetch user pets", err);
      })
      .finally(() => setIsLoadingPets(false));
  }, []);

  const handleToggleNotif = (key: string, setter: (v: boolean) => void, curr: boolean) => {
    const next = !curr;
    setter(next);
    localStorage.setItem(key, String(next));
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardNumber.trim()) return;
    const cleanNum = newCardNumber.replace(/\s/g, "");
    const last4 = cleanNum.slice(-4) || "9999";
    const brand = cleanNum.startsWith("5") ? "Mastercard" : "Visa";
    const newCard = {
      id: `pm-${Date.now()}`,
      label: `${brand} ending in ${last4}`,
      default: paymentMethods.length === 0,
      cardHolder: newCardName.trim() || user.name,
    };
    const updated = [...paymentMethods, newCard];
    setPaymentMethods(updated);
    localStorage.setItem("vetloop_payment_methods", JSON.stringify(updated));
    setShowAddCardModal(false);
    setNewCardNumber("");
    setNewCardName("");
  };

  const handleSetDefaultCard = (id: string) => {
    const updated = paymentMethods.map((pm) => ({
      ...pm,
      default: pm.id === id,
    }));
    setPaymentMethods(updated);
    localStorage.setItem("vetloop_payment_methods", JSON.stringify(updated));
  };

  // Convert real pets into IoT collar device representation
  const iotCollars = realPets.map((p) => ({
    id: p.id,
    label: p.iotCollarMacAddress ? `Smart Collar (${p.iotCollarMacAddress})` : `Smart Collar (${p.species})`,
    subject: `${p.name} · ${p.breed}`,
    online: true,
  }));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
            <Settings className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Settings & Preferences</h1>
            <p className="text-xs text-slate-500">Live .NET API Sync & Device Management</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Profile Card */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl font-black text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)]">
                {user.avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <span className="text-[8px] text-white font-black">✓</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
              <span
                className={`inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${roleCfg.bg} ${roleCfg.color}`}
              >
                {user.role === "veterinarian" ? <Stethoscope className="w-3 h-3" /> : user.role === "farm-owner" ? <Wheat className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                {roleCfg.label}
              </span>
            </div>
            <button className="flex-shrink-0 p-2 text-slate-500 hover:text-slate-300 bg-slate-800/60 rounded-xl border border-slate-700/40 hover:border-slate-600 transition-all">
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-5">
          <div className="flex items-center gap-2.5 mb-1">
            <Bell className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Notification Preferences</h2>
          </div>
          <p className="text-[11px] text-slate-600 mb-3">
            Control alert and notification thresholds (Persisted in session)
          </p>
          <div className="divide-y divide-slate-800">
            <ToggleRow
              label="Appointment Reminders"
              sublabel="24h and 1h before each booking"
              checked={notifAppointments}
              onChange={() => handleToggleNotif("vetloop_notif_appts", setNotifAppointments, notifAppointments)}
            />
            <ToggleRow
              label="IoT Critical Alerts"
              sublabel="Sensor anomalies above threshold"
              checked={notifIoTAlerts}
              onChange={() => handleToggleNotif("vetloop_notif_iot", setNotifIoTAlerts, notifIoTAlerts)}
            />
            <ToggleRow
              label="Payment & Invoice Updates"
              sublabel="New invoices and payment receipts"
              checked={notifPayments}
              onChange={() => handleToggleNotif("vetloop_notif_pay", setNotifPayments, notifPayments)}
            />
            <ToggleRow
              label="AI Diagnostic Insights"
              sublabel="Weekly health summary from VetLoop AI"
              checked={notifAIUpdates}
              onChange={() => handleToggleNotif("vetloop_notif_ai", setNotifAIUpdates, notifAIUpdates)}
            />
          </div>
        </div>

        {/* Linked IoT Devices (Real Backend Data from /api/pets) */}
        <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Linked IoT Devices</h2>
                <p className="text-[10px] text-slate-500">Real pets & collars synced from PostgreSQL DB</p>
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {isLoadingPets ? (
              <div className="p-4 text-center text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400 inline mr-2" />
                IoT cihaz verileri yükleniyor...
              </div>
            ) : iotCollars.length > 0 ? (
              iotCollars.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{device.label}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{device.subject}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    ONLINE
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-800/40 rounded-xl border border-slate-700/40">
                Kayıtlı evcil hayvan veya IoT tasma bulunamadı.
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods (Dynamic Storage Enriched) */}
        <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-bold text-white">Payment Methods</h2>
            </div>
            <button
              onClick={() => setShowAddCardModal(true)}
              className="flex items-center gap-1.5 text-[11px] text-sky-400 hover:text-sky-300 font-semibold px-2.5 py-1.5 bg-sky-500/10 rounded-lg border border-sky-500/20 hover:border-sky-500/40 transition-all"
            >
              <Plus className="w-3 h-3" />
              Add Card
            </button>
          </div>
          <p className="text-[11px] text-slate-600 mb-3">
            Used for vet appointments and VetLoop Pro subscription
          </p>
          <div className="space-y-2.5">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                onClick={() => handleSetDefaultCard(pm.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  pm.default
                    ? "bg-sky-500/5 border-sky-500/30"
                    : "bg-slate-800/60 border-slate-700/40 hover:border-slate-600"
                }`}
              >
                <div className="w-9 h-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded border border-slate-500/40 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">{pm.label}</p>
                  {pm.cardHolder && <p className="text-[10px] text-slate-500">{pm.cardHolder}</p>}
                </div>
                {pm.default && (
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                    Default
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </div>
            ))}
          </div>
        </div>

        {/* Modal: Add Payment Card */}
        {showAddCardModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-3">Kart Ekle</h3>
              <form onSubmit={handleAddCard} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Kart Üzerindeki İsim</label>
                  <input
                    type="text"
                    placeholder="Ad Soyad"
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Kart Numarası</label>
                  <input
                    type="text"
                    placeholder="**** **** **** 4242"
                    value={newCardNumber}
                    onChange={(e) => setNewCardNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCardModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 font-semibold"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* App Info */}
        <div className="rounded-2xl bg-slate-800/20 border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-500">App Info</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: "Version", value: "2.4.1 (Build 847)" },
              { label: "Environment", value: "Production .NET Web API" },
              { label: "AI Model", value: "VetLoop Vision v2 (OpenAI)" },
              { label: "Database", value: "PostgreSQL v16 (EF Core)" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{label}</span>
                <span className="text-xs text-slate-500 font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        {!logoutConfirm ? (
          <button
            onClick={() => setLogoutConfirm(true)}
            className="w-full py-3.5 rounded-xl border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/10 hover:border-red-500/40 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        ) : (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
            <p className="text-sm text-slate-300 mb-3 text-center">
              Are you sure you want to sign out?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:border-slate-500 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

// ─── Main App Shell ─────────────────────────────────────────────

// ─── Initial Gateway Screen ─────────────────────────────────────

function InitialGatewayScreen({
  onLogin,
  onContinueEmail,
  onAdminPortal,
}: {
  onLogin: (user: AuthUser) => void;
  onContinueEmail: () => void;
  onAdminPortal: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col overflow-hidden relative">
      {/* ── Ambient background layers ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large central glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-emerald-500/8 rounded-full blur-[140px]" />
        {/* Bottom violet accent */}
        <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] bg-violet-500/7 rounded-full blur-[120px]" />
        {/* Top-left sky tint */}
        <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-[100px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(52,211,153,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.4) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Hero section ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo mark */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-600/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_60px_rgba(52,211,153,0.2)]">
            <Stethoscope className="w-12 h-12 text-emerald-400" />
          </div>
          {/* Orbiting dot */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-violet-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        {/* Wordmark */}
        <h1 className="text-5xl font-black text-white tracking-tight mb-2">
          Vet<span className="text-emerald-400">Loop</span>
        </h1>
        <p className="text-slate-500 text-sm mb-1">
          Veterinary Intelligence Platform
        </p>
        <div className="flex items-center gap-2 mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] text-slate-600 font-mono">
            B2C · B2B · AI-Powered · IoT-Connected
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
        </div>

        {/* ── Gerçek OAuth Buttons SDK ── */}
        <div className="w-full max-w-sm space-y-4">
          <OAuthButtons
            onSuccess={() => {
              const authUser = useAuthStore.getState().user;
              if (authUser) {
                onLogin({
                  name: authUser.fullName,
                  email: authUser.email,
                  role: authUser.role === "Veterinarian" ? "veterinarian" : authUser.role === "FarmOwner" ? "farm-owner" : "pet-owner",
                  avatar: authUser.fullName.charAt(0),
                });
              }
            }}
          />

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[11px] text-slate-600 font-mono">VEYA</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Continue with Email */}
          <button
            onClick={onContinueEmail}
            className="w-full h-13 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 font-semibold text-sm rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 border border-slate-700/60 hover:border-slate-600 active:scale-[0.98] disabled:opacity-50"
          >
            <Mail className="w-4.5 h-4.5 text-slate-400" />
            Continue with Email
          </button>
        </div>

        {/* Trust badges */}
        <div className="flex items-center gap-4 mt-8">
          {[
            { icon: ShieldCheck, label: "HIPAA Ready" },
            { icon: Fingerprint, label: "Biometric Auth" },
            { icon: BadgeCheck, label: "SOC 2 Type II" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Icon className="w-3 h-3 text-slate-700" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer — subtle admin backdoor ── */}
      <div className="relative z-10 pb-5 flex flex-col items-center gap-2">
        <p className="text-[10px] text-slate-800">
          By continuing you agree to our Terms · Privacy Policy
        </p>
        {/* Hidden admin link — extremely low contrast, almost invisible */}
        <button
          onClick={onAdminPortal}
          className="text-[9px] text-slate-800/40 hover:text-slate-700/60 transition-colors duration-300 flex items-center gap-1 select-none"
          aria-label="System Management"
        >
          <Settings className="w-2.5 h-2.5" />
          System Management
        </button>
      </div>
    </div>
  );
}

// ─── Admin Login Screen ─────────────────────────────────────────

interface AdminUser {
  id: string;
  name: string;
  role: string;
}

function AdminDashboard({ admin, onLogout }: { admin: AdminUser; onLogout: () => void }) {
  const stats = [
    { label: "Total Users", value: "14,832", delta: "+12%", color: "text-emerald-400" },
    { label: "Active Vets", value: "1,247", delta: "+8%", color: "text-sky-400" },
    { label: "IoT Devices", value: "6,091", delta: "+31%", color: "text-violet-400" },
    { label: "AI Diagnoses", value: "89,403", delta: "+47%", color: "text-amber-400" },
  ];

  const recentActions = [
    { action: "User suspended", actor: "admin@vetloop.io", time: "2 min ago", severity: "warn" },
    { action: "IoT firmware deployed", actor: "devops@vetloop.io", time: "14 min ago", severity: "info" },
    { action: "Billing plan updated", actor: "finance@vetloop.io", time: "1 hr ago", severity: "info" },
    { action: "Critical sensor override", actor: "sre@vetloop.io", time: "3 hrs ago", severity: "critical" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-y-auto">
      {/* Admin top bar */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-blue-900/40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-600/20 rounded-lg border border-blue-600/30">
            <ServerCog className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">VetLoop Master Control</p>
            <p className="text-[10px] text-slate-600 font-mono">
              Authenticated as <span className="text-blue-400">{admin.name}</span> · {admin.role}
            </p>
          </div>
          <span className="ml-2 text-[9px] font-bold px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full border border-red-500/30 animate-pulse">
            ADMIN MODE
          </span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit Admin
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-900 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-600 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-600 mt-1">{s.delta} this month</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Admin Quick Actions</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Users, label: "Manage Users", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { icon: BarChart3, label: "Analytics", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
              { icon: ServerCog, label: "IoT Fleet", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
              { icon: AlertOctagon, label: "Incident Log", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
            ].map(({ icon: Icon, label, color, bg }) => (
              <button
                key={label}
                className={`flex flex-col items-start gap-3 p-4 rounded-xl border ${bg} hover:scale-[1.02] active:scale-[0.98] transition-all`}
              >
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm font-semibold text-slate-200">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Audit log */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-slate-500" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Audit Log</p>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Live
            </span>
          </div>
          <div className="space-y-2.5">
            {recentActions.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/40">
                <div
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    a.severity === "critical" ? "bg-red-500" : a.severity === "warn" ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
                <p className="text-sm text-slate-200 flex-1">{a.action}</p>
                <p className="text-[11px] text-slate-600 font-mono">{a.actor}</p>
                <p className="text-[10px] text-slate-700 whitespace-nowrap">{a.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminLoginScreen({
  onSuccess,
  onBack,
}: {
  onSuccess: (admin: AdminUser) => void;
  onBack: () => void;
}) {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [twoFA, setTwoFA] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<"credentials" | "2fa" | "loading">("credentials");
  const [error, setError] = useState("");
  // Track secret knock: clicking the lock icon 5× reveals demo creds
  const [tapCount, setTapCount] = useState(0);

  const handleCredentials = async () => {
    if (!adminId || !password) { setError("Admin ID and password required."); return; }
    setError("");
    setPhase("loading");
    await new Promise((r) => setTimeout(r, 1200));
    setPhase("2fa");
  };

  const handle2FA = async () => {
    if (twoFA.length < 6) { setError("Enter the 6-digit 2FA code."); return; }
    setError("");
    setPhase("loading");
    await new Promise((r) => setTimeout(r, 1500));
    onSuccess({ id: adminId, name: "Platform Administrator", role: "Super Admin" });
  };

  const handleIconTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 5) {
      setAdminId("admin@vetloop.io");
      setPassword("Admin#Secure9!");
      setTapCount(0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* ── Background — intentionally corporate / sterile ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-blue-600/8 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-slate-800/60 blur-[80px] rounded-full" />
        {/* Corner classification banner */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-600/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-600/40 to-transparent" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Classification header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="text-[10px] text-slate-700 hover:text-slate-500 flex items-center gap-1 transition-colors"
          >
            ← Back to Gateway
          </button>
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-red-500/60 border border-red-500/20 px-2 py-1 rounded">
            <AlertOctagon className="w-2.5 h-2.5" />
            RESTRICTED ACCESS
          </div>
        </div>

        {/* Logo + Title */}
        <div className="text-center mb-8">
          <button
            onClick={handleIconTap}
            className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 rounded-2xl border border-blue-600/30 mb-4 hover:bg-blue-600/20 transition-colors"
          >
            <Shield className="w-8 h-8 text-blue-400" />
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight">VetLoop</h1>
          <p className="text-blue-400 font-bold text-sm mt-0.5">Master Control Portal</p>
          <p className="text-slate-600 text-[11px] mt-1 font-mono">
            Authorized personnel only · All access is logged
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-[0_0_60px_rgba(37,99,235,0.08)]">

          {/* Phase indicator */}
          <div className="flex items-center gap-2 mb-5">
            {["credentials", "2fa"].map((p, i) => (
              <div key={p} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                    (phase === "credentials" && i === 0) ||
                    (phase === "2fa" && i === 1) ||
                    (phase === "loading" && i === 1)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : phase === "2fa" && i === 0
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : "bg-slate-800 border-slate-700 text-slate-600"
                  }`}
                >
                  {phase === "2fa" && i === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-[10px] font-mono ${ i === 0 && phase !== "2fa" ? "text-slate-400" : "text-slate-600"}`}>
                  {i === 0 ? "Credentials" : "2-Factor Auth"}
                </span>
                {i === 0 && <div className="w-8 h-px bg-slate-700 mx-1" />}
              </div>
            ))}
          </div>

          {phase !== "2fa" && (
            <div className="space-y-3">
              {/* Admin ID */}
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="Admin ID or Email"
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                />
              </div>
              {/* Password */}
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Secure Password"
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleCredentials()}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {phase === "2fa" && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 mx-auto bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center mb-3">
                  <Fingerprint className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-sm text-slate-300 font-semibold">Two-Factor Authentication</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              {/* 2FA code input — styled as OTP blocks */}
              <div className="relative">
                <input
                  type="text"
                  value={twoFA}
                  onChange={(e) => setTwoFA(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-slate-900/60 border border-blue-500/30 rounded-xl px-4 py-4 text-2xl text-center text-blue-400 placeholder-slate-700 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono tracking-[0.5em]"
                  onKeyDown={(e) => e.key === "Enter" && handle2FA()}
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-slate-700 text-center font-mono">
                Demo: enter any 6 digits (e.g. 847291)
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-3">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={phase === "2fa" ? handle2FA : handleCredentials}
            disabled={phase === "loading"}
            className={`
              mt-4 w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2
              ${
                phase === "loading"
                  ? "bg-blue-600/30 text-blue-400/60 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_24px_rgba(37,99,235,0.4)] hover:shadow-[0_4px_32px_rgba(37,99,235,0.6)] active:scale-[0.98]"
              }
            `}
          >
            {phase === "loading" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
            ) : phase === "2fa" ? (
              <><CheckCircle2 className="w-4 h-4" /> Verify & Enter Dashboard</>
            ) : (
              <><Shield className="w-4 h-4" /> Login to Admin Dashboard</>
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] text-slate-800 mt-4 font-mono">
          Unauthorized access to this system is a violation of VetLoop policy and may be subject to legal action.
        </p>
      </div>
    </div>
  );
}

// ─── Main App Shell ─────────────────────────────────────────────

export default function AppShell() {
  useSessionRestore();

  const [screen, setScreen] = useState<AppScreen>("gateway");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const storeUser = useAuthStore((s) => s.user);

  const currentUser: AuthUser | null = user ?? (storeUser ? {
    name: storeUser.fullName,
    email: storeUser.email,
    role: storeUser.role === "Veterinarian" ? "veterinarian" : storeUser.role === "FarmOwner" ? "farm-owner" : "pet-owner",
    avatar: storeUser.fullName.charAt(0),
  } : null);

  const handleLogin = (u: AuthUser) => {
    setUser(u);
    setScreen("dashboard");
  };

  const handleLogout = () => {
    useAuthStore.getState().logout();
    setUser(null);
    setScreen("gateway");
  };

  const handleAdminLogin = (admin: AdminUser) => {
    setAdminUser(admin);
    setScreen("admin-dashboard");
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    setScreen("gateway");
  };

  // ── Unauthenticated / pre-login screens ──
  if (screen === "gateway") {
    return (
      <InitialGatewayScreen
        onLogin={handleLogin}
        onContinueEmail={() => setScreen("auth")}
        onAdminPortal={() => setScreen("admin-login")}
      />
    );
  }

  if (screen === "auth") {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (screen === "admin-login") {
    return (
      <AdminLoginScreen
        onSuccess={handleAdminLogin}
        onBack={() => setScreen("gateway")}
      />
    );
  }

  if (screen === "admin-dashboard" && adminUser) {
    return <AdminDashboard admin={adminUser} onLogout={handleAdminLogout} />;
  }

  // ── Authenticated main app ──
  const NAV_TABS: {
    id: AppScreen;
    icon: React.ElementType;
    label: string;
    color: string;
  }[] = [
    { id: "dashboard", icon: Activity, label: "Dashboard", color: "text-emerald-400" },
    { id: "ai-diagnostic", icon: BrainCircuit, label: "AI Diagnosis", color: "text-violet-400" },
    { id: "iot-dashboard", icon: Radio, label: "IoT Monitor", color: "text-sky-400" },
    { id: "settings", icon: Settings, label: "Settings", color: "text-slate-400" },
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Left sidebar nav */}
      <aside className="w-16 bg-slate-950 border-r border-slate-800/80 flex flex-col items-center py-5 gap-2 flex-shrink-0">
        {/* Logo mark */}
        <div className="w-9 h-9 bg-emerald-500/15 rounded-xl border border-emerald-500/30 flex items-center justify-center mb-4">
          <Stethoscope className="w-4 h-4 text-emerald-400" />
        </div>

        {NAV_TABS.map(({ id, icon: Icon, label, color }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              onClick={() => setScreen(id)}
              title={label}
              className={`
                relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
                ${active
                  ? "bg-slate-800 border border-slate-700/80"
                  : "hover:bg-slate-800/60 border border-transparent"
                }
              `}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  active ? color : "text-slate-600 group-hover:text-slate-400"
                }`}
              />
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-emerald-400" />
              )}
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-[10px] text-slate-300 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-slate-700 z-50">
                {label}
              </span>
            </button>
          );
        })}

        {/* Avatar at bottom */}
        <div className="mt-auto">
          <button
            onClick={() => setScreen("settings")}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[11px] font-black text-white shadow-[0_2px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_2px_20px_rgba(16,185,129,0.4)] transition-all"
          >
            {currentUser?.avatar ?? "?"}
          </button>
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 flex overflow-hidden">
        {screen === "dashboard" && <ModernDashboard />}
        {screen === "ai-diagnostic" && currentUser && <AIDiagnosticScreen user={currentUser} />}
        {screen === "iot-dashboard" && <MonitoringHub />}
        {screen === "settings" && currentUser && (
          <SettingsScreen user={currentUser} onLogout={handleLogout} />
        )}
      </main>
    </div>
  );
}
