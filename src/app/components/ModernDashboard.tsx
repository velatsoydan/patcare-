import React, { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Activity,
  ChevronRight,
  Sparkles,
  Stethoscope,
  Trash2,
} from "lucide-react";
import {
  useMyAppointments,
  useVetAppointments,
  useCancelAppointment,
  useUpdateAppointmentStatus,
} from "../../hooks/useAppointments";
import { useAuthStore } from "../../store/authStore";
import {
  getStatusLabel,
  getStatusColor,
  createAppointment,
} from "../../services/appointmentService";
import type { AppointmentResponse, AppointmentStatus } from "../../types/api";

export default function ModernDashboard() {
  const { user } = useAuthStore();

  // Role Normalization
  const rawRole = user?.role || "PetOwner";
  const isVet = rawRole === "Veterinarian" || rawRole === "veterinarian";
  const isFarm = rawRole === "FarmOwner" || rawRole === "farm-owner";
  const isPetOwner = !isVet && !isFarm;

  // Real backend queries — ZERO MOCK DATA
  const myAptsQuery = useMyAppointments();
  const vetAptsQuery = useVetAppointments();

  const { appointments, isLoading, error, refetch } = isVet ? vetAptsQuery : myAptsQuery;
  const { cancel, isLoading: isCancelling } = useCancelAppointment();
  const { update: updateStatus, isLoading: isUpdatingStatus } = useUpdateAppointmentStatus();

  // Local state for filtering & Search & Create Modal
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Appointment Form State
  const [petId, setPetId] = useState("");
  const [vetProfileId, setVetProfileId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reason, setReason] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats calculation from REAL backend data
  const totalCount = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === "Pending").length;
  const confirmedCount = appointments.filter((a) => a.status === "Confirmed").length;
  const completedCount = appointments.filter((a) => a.status === "Completed").length;

  // Filtered Appointments
  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.vetFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPetId = petId.trim();
    const cleanVetProfileId = vetProfileId.trim();

    if (!cleanPetId || !cleanVetProfileId || !scheduledAt) {
      setCreateError("Lütfen tüm zorunlu alanları doldurun (Pet ID, Vet Profile ID, Tarih).");
      return;
    }

    const scheduledDateObj = new Date(scheduledAt);
    if (isNaN(scheduledDateObj.getTime())) {
      setCreateError("Lütfen geçerli bir tarih ve saat seçiniz.");
      return;
    }

    if (scheduledDateObj.getTime() <= Date.now()) {
      setCreateError("Randevu tarihi gelecekte bir zaman dilimi olmalıdır.");
      return;
    }

    setCreateError(null);
    setIsSubmitting(true);
    try {
      await createAppointment({
        petId: cleanPetId,
        vetProfileId: cleanVetProfileId,
        scheduledAt: scheduledDateObj.toISOString(),
        durationMinutes: Number(durationMinutes) || 30,
        reason: reason ? reason.trim() : undefined,
      });
      setIsModalOpen(false);
      // Reset form
      setPetId("");
      setVetProfileId("");
      setScheduledAt("");
      setReason("");
      await refetch();
    } catch (err: any) {
      setCreateError(err.message || "Randevu oluşturulamadı. Lütfen UUID'leri ve tarihi kontrol edin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (confirm("Bu randevuyu iptal etmek istediğinize emin misiniz?")) {
      await cancel(id, () => refetch());
    }
  };

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    await updateStatus(id, { newStatus }, () => refetch());
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 overflow-y-auto p-6 lg:p-10 relative">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[300px] bg-sky-500/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className={`px-2 py-0.5 rounded-full border ${
                isVet
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : isFarm
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-sky-500/10 border-sky-500/30 text-sky-400"
              }`}>
                {isVet ? "🩺 Veteriner Hekim Portalı" : isFarm ? "🌾 Sürü & Çiftlik Portalı" : "🐾 Evcil Hayvan Sahibi Portalı"}
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mt-1">
              Hoş Geldiniz, {user?.fullName || "Kullanıcı"}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {isVet
                ? "Klinik Muayeneleri ve Atanmış Hasta Randevuları"
                : isFarm
                ? "Sürü Sağlık Kontrolleri ve Çiftlik Veteriner Talepleri"
                : "Evcil Hayvan Sağlık Takibi ve Randevularım"}{" "}
              · <span className="text-emerald-400 font-semibold font-mono">.NET API Active</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all shadow-sm active:scale-95 flex items-center gap-2 text-xs font-medium"
              title="Verileri Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
              <span>Yenile</span>
            </button>

            {!isVet && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{isFarm ? "Yeni Sürü Muayenesi İste" : "Yeni Randevu Al"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => refetch()} className="underline font-semibold hover:text-white">
              Tekrar Deneyin
            </button>
          </div>
        )}

        {/* Glassmorphic Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Toplam Randevu */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200 ease-in-out shadow-lg group hover:scale-[1.01]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isVet ? "Klinik Muayeneleri" : isFarm ? "Sürü Muayeneleri" : "Randevularım"}
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-9 w-20 bg-slate-800/80 rounded-xl animate-skeleton my-1" />
            ) : (
              <p className="text-3xl font-black text-white tracking-tight">{totalCount}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Veritabanındaki aktif kayıtlar</p>
          </div>

          {/* Card 2: Onay Bekleyenler */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200 ease-in-out shadow-lg group hover:scale-[1.01]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isVet ? "Onay Bekleyen Vakalar" : isFarm ? "Onay Bekleyen Çağrılar" : "Onay Bekleyenler"}
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-9 w-20 bg-slate-800/80 rounded-xl animate-skeleton my-1" />
            ) : (
              <p className="text-3xl font-black text-amber-400 tracking-tight">{pendingCount}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Veteriner onayı bekleyen randevular</p>
          </div>

          {/* Card 3: Onaylananlar */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200 ease-in-out shadow-lg group hover:scale-[1.01]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Onaylanan Randevular
              </span>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-9 w-20 bg-slate-800/80 rounded-xl animate-skeleton my-1" />
            ) : (
              <p className="text-3xl font-black text-sky-400 tracking-tight">{confirmedCount}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Takvime işlenmiş seanslar</p>
          </div>

          {/* Card 4: Tamamlananlar */}
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200 ease-in-out shadow-lg group hover:scale-[1.01]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tamamlanan Randevular
              </span>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-9 w-20 bg-slate-800/80 rounded-xl animate-skeleton my-1" />
            ) : (
              <p className="text-3xl font-black text-violet-400 tracking-tight">{completedCount}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Geçmiş muayeneler ve raporlar</p>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 lg:p-8 space-y-6 shadow-2xl animate-fadeIn">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Hasta adı, veteriner veya neden ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Filter className="w-4 h-4 text-slate-500 mr-1 hidden sm:block" />
              {(["ALL", "Pending", "Confirmed", "Completed", "Cancelled"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    statusFilter === st
                      ? "bg-slate-800 border border-slate-700 text-emerald-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {st === "ALL" ? "Tümü" : getStatusLabel(st as AppointmentStatus)}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/90 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="px-5 py-4">Evcil Hayvan / Hasta</th>
                  <th className="px-5 py-4">Veteriner</th>
                  <th className="px-5 py-4">Tarih & Saat</th>
                  <th className="px-5 py-4">Neden</th>
                  <th className="px-5 py-4">Durum</th>
                  <th className="px-5 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                {/* 1. Loading Skeleton Rows */}
                {isLoading &&
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="animate-skeleton">
                      <td className="px-5 py-4">
                        <div className="h-4 w-32 bg-slate-800/80 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-28 bg-slate-800/80 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-36 bg-slate-800/80 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-40 bg-slate-800/80 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-6 w-20 bg-slate-800/80 rounded-full" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="h-4 w-12 bg-slate-800/80 rounded-lg ml-auto" />
                      </td>
                    </tr>
                  ))}

                {/* 2. Enriched Empty State */}
                {!isLoading && filteredAppointments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="max-w-sm mx-auto space-y-4 animate-fadeIn">
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.15)]">
                          <Calendar className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-200">
                            {searchTerm || statusFilter !== "ALL"
                              ? "Aramanıza Uygun Randevu Bulunamadı"
                              : "Henüz Kayıtlı Randevu Bulunmuyor"}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {searchTerm || statusFilter !== "ALL"
                              ? "Filtreleme kriterlerinizi değiştirerek tekrar arayabilir veya tüm randevuları görüntüleyebilirsiniz."
                              : "Veteriner kliniğiniz veya evcil hayvan bakım seanslarınız için canlı randevu kaydı oluşturabilirsiniz."}
                          </p>
                        </div>
                        {searchTerm || statusFilter !== "ALL" ? (
                          <button
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("ALL");
                            }}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all duration-200 active:scale-95"
                          >
                            Filtreleri Temizle
                          </button>
                        ) : !isVet ? (
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 transition-all duration-200 shadow-lg active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Hemen Randevu Oluştur</span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )}

                {/* 3. Real Data Rows */}
                {!isLoading &&
                  filteredAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                            {apt.petName?.charAt(0) || "P"}
                          </div>
                          <span>{apt.petName || "Evcil Hayvan"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {apt.vetFullName || "Veteriner Hekim"}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs font-mono">
                        {new Date(apt.scheduledAt).toLocaleString("tr-TR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-5 py-4 text-slate-400 max-w-xs truncate">
                        {apt.reason || "Genel Muayene"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-block ${getStatusColor(
                            apt.status
                          )}`}
                        >
                          {getStatusLabel(apt.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        {/* Vet Status Action */}
                        {isVet && apt.status === "Pending" && (
                          <button
                            onClick={() => handleStatusChange(apt.id, "Confirmed")}
                            disabled={isUpdatingStatus}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold hover:bg-sky-500/20 transition-all"
                          >
                            Onayla
                          </button>
                        )}
                        {isVet && apt.status === "Confirmed" && (
                          <button
                            onClick={() => handleStatusChange(apt.id, "Completed")}
                            disabled={isUpdatingStatus}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
                          >
                            Tamamla
                          </button>
                        )}

                        {/* Cancel Action */}
                        {apt.status !== "Completed" && apt.status !== "Cancelled" && (
                          <button
                            onClick={() => handleCancel(apt.id)}
                            disabled={isCancelling}
                            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"
                            title="Randevuyu İptal Et"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 relative animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                {isFarm ? "Yeni Sürü Muayenesi İste" : "Yeni Randevu Oluştur"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Pet ID (UUID)</label>
                <input
                  type="text"
                  placeholder="Evcil hayvanınızın ID'si"
                  value={petId}
                  onChange={(e) => setPetId(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none transition-all duration-200 ${
                    createError && !petId.trim()
                      ? "border-rose-500/80 bg-rose-500/5 focus:border-rose-500"
                      : "border-slate-800 focus:border-emerald-500/50"
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Veteriner Profile ID (UUID)</label>
                <input
                  type="text"
                  placeholder="Veteriner Hekim ID'si"
                  value={vetProfileId}
                  onChange={(e) => setVetProfileId(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none transition-all duration-200 ${
                    createError && !vetProfileId.trim()
                      ? "border-rose-500/80 bg-rose-500/5 focus:border-rose-500"
                      : "border-slate-800 focus:border-emerald-500/50"
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Tarih ve Saat</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Süre (Dakika)</label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-all duration-200"
                  >
                    <option value={15}>15 dk</option>
                    <option value={30}>30 dk</option>
                    <option value={45}>45 dk</option>
                    <option value={60}>60 dk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium font-sans">Muayene / Randevu Nedeni</label>
                <textarea
                  rows={3}
                  placeholder="Şikayet veya talep detayları..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-all duration-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all duration-200 active:scale-95"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <span>Randevu Kaydet</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
