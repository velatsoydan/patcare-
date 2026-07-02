/**
 * VetLoop — Active Monitoring & AI Hub
 * ─────────────────────────────────────────────────────────────
 * Full-featured real-time IoT monitoring, AI triage, and
 * freelance vet ERP quick-actions panel.
 *
 * Stack: React 18 · TypeScript · Tailwind CSS v4 · Recharts · Lucide
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Thermometer,
  Heart,
  Zap,
  Brain,
  FileText,
  CreditCard,
  Truck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Radio,
  Shield,
  TrendingUp,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

interface SensorReading {
  ts: string;
  temp: number;
  bpm: number;
  bpmScaled: number; // bpm / 10 — pre-computed for Recharts compatibility
  activity: number;
}

interface IoTDevice {
  id: string;
  label: string;
  subject: string;
  location: string;
  online: boolean;
  temperature: number;
  heartRate: number;
  activityLevel: number; // 0-100
  history: SensorReading[];
}

interface AIAnalysisResult {
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
  recommendations: string[];
  confidence: number;
}

interface ERPAction {
  id: string;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: string;
  accent: string;
  count?: number;
}

// ─── Mock Data Generators ─────────────────────────────────────

function randomBetween(min: number, max: number, decimals = 1): number {
  const v = Math.random() * (max - min) + min;
  return parseFloat(v.toFixed(decimals));
}

function generateHistory(baseTemp: number, baseBpm: number): SensorReading[] {
  return Array.from({ length: 20 }, (_, i) => {
    const bpm = randomBetween(baseBpm - 6, baseBpm + 6, 0);
    return {
      ts: `${i}s`,
      temp: randomBetween(baseTemp - 0.4, baseTemp + 0.4),
      bpm,
      bpmScaled: parseFloat((bpm / 10).toFixed(1)),
      activity: randomBetween(20, 80, 0),
    };
  });
}

const INITIAL_DEVICES: IoTDevice[] = [
  {
    id: "d-001",
    label: "Smart Collar #A-42",
    subject: "Golden Retriever — Tarçın",
    location: "Clinic Bay 1",
    online: true,
    temperature: 38.4,
    heartRate: 78,
    activityLevel: 62,
    history: generateHistory(38.4, 78),
  },
  {
    id: "d-002",
    label: "Farm Sensor #B-07",
    subject: "Cattle #842 — Barn 3",
    location: "Sütaş Dairy Farm",
    online: true,
    temperature: 39.8,
    heartRate: 64,
    activityLevel: 18,
    history: generateHistory(39.8, 64),
  },
  {
    id: "d-003",
    label: "Smart Collar #A-19",
    subject: "Persian Cat — Luna",
    location: "Clinic Bay 2",
    online: true,
    temperature: 38.1,
    heartRate: 142,
    activityLevel: 45,
    history: generateHistory(38.1, 142),
  },
];

const ERP_ACTIONS: ERPAction[] = [
  {
    id: "invoice",
    icon: FileText,
    label: "Issue Quick Invoice",
    sublabel: "₺ Billing & Payments",
    color: "from-emerald-500/20 to-emerald-600/10",
    accent: "text-emerald-400",
    count: 3,
  },
  {
    id: "payments",
    icon: CreditCard,
    label: "Pending Client Payments",
    sublabel: "4 overdue · ₺12,450",
    color: "from-amber-500/20 to-amber-600/10",
    accent: "text-amber-400",
    count: 4,
  },
  {
    id: "dispatch",
    icon: Truck,
    label: "Dispatch to Farm",
    sublabel: "Sütaş Farm · 2 km away",
    color: "from-sky-500/20 to-sky-600/10",
    accent: "text-sky-400",
  },
];

const MOCK_AI_RESPONSES: Record<string, AIAnalysisResult> = {
  CRITICAL: {
    riskLevel: "CRITICAL",
    summary:
      "Elevated core temperature (39.8 °C) combined with significantly reduced activity (18%) and suppressed heart rate strongly indicates acute febrile illness. Immediate clinical intervention is required.",
    recommendations: [
      "Dispatch on-site veterinarian within 30 minutes",
      "Administer antipyretic (Flunixin Meglumine 2.2 mg/kg IV) as first response",
      "Collect blood culture and complete CBC panel",
      "Isolate animal from herd to prevent potential contagion",
      "Monitor vitals every 15 minutes until vet arrival",
    ],
    confidence: 94,
  },
  MEDIUM: {
    riskLevel: "MEDIUM",
    summary:
      "Slightly elevated temperature with moderate activity reduction. Could indicate early-stage infection or environmental stress. Monitoring and preventive action advised.",
    recommendations: [
      "Schedule telehealth consultation within 24 hours",
      "Review recent feed and water intake logs",
      "Check ambient temperature and ventilation in enclosure",
      "Increase monitoring frequency to every 2 hours",
    ],
    confidence: 78,
  },
  LOW: {
    riskLevel: "LOW",
    summary:
      "All vitals are within normal reference ranges. Animal displays healthy physiological patterns consistent with age, breed, and weight profile.",
    recommendations: [
      "Continue routine monitoring schedule",
      "Ensure next vaccination is on schedule",
      "No immediate veterinary action required",
    ],
    confidence: 96,
  },
};

// ─── Sub-components ───────────────────────────────────────────

/** Animated pulsing dot for "live" indicator */
function LiveDot({ critical = false }: { critical?: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          critical ? "bg-red-500" : "bg-emerald-400"
        }`}
      />
      <span
        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
          critical ? "bg-red-500" : "bg-emerald-400"
        }`}
      />
    </span>
  );
}

/** Radial status ring around a metric value */
function StatusRing({
  value,
  max,
  label,
  unit,
  warn,
  critical: criticalThreshold,
  color,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  warn: number;
  critical: number;
  color: string;
}) {
  const safeMax = max > 0 ? max : 100;
  const pct = Math.min(Math.max((value / safeMax) * 100, 0), 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  // Only apply threshold colours when thresholds are meaningful (> 0)
  const isWarn = warn > 0 && value >= warn;
  const isCrit = criticalThreshold > 0 && value >= criticalThreshold;
  const stroke = isCrit ? "#ef4444" : isWarn ? "#f59e0b" : color;

  const dashStr = `${dash.toFixed(2)} ${circ.toFixed(2)}`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[72px] h-[72px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="#1e293b"
            stroke-width="6"
          />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={stroke}
            stroke-width="6"
            stroke-dasharray={dashStr}
            stroke-linecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color: stroke }}>
            {value}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 text-center leading-tight">
        {label}
        <br />
        <span className="text-slate-500">{unit}</span>
      </p>
    </div>
  );
}

/** Mini sparkline graph for a single metric */
function SparkLine({
  data,
  dataKey,
  color,
  warnValue,
}: {
  data: SensorReading[];
  dataKey: string;
  color: string;
  warnValue?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        {warnValue != null && (
          <ReferenceLine
            y={warnValue}
            stroke="#ef4444"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Activity bar visual */
function ActivityBar({ value }: { value: number }) {
  const bars = 12;
  const filled = Math.round((value / 100) * bars);
  return (
    <div className="flex gap-0.5 items-end h-8">
      {Array.from({ length: bars }, (_, i) => {
        const height = 40 + Math.random() * 60; // varied heights
        const active = i < filled;
        return (
          <div
            key={i}
            className="w-1.5 rounded-sm transition-all duration-500"
            style={{
              height: `${height}%`,
              backgroundColor: active
                ? value < 25
                  ? "#ef4444"
                  : value < 50
                  ? "#f59e0b"
                  : "#34d399"
                : "#1e293b",
              opacity: active ? 1 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
}

/** Single IoT Device Card */
function DeviceCard({
  device,
  selected,
  onSelect,
}: {
  device: IoTDevice;
  selected: boolean;
  onSelect: () => void;
}) {
  const isCritical = device.temperature > 39.5;

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left rounded-xl p-4 border transition-all duration-300 cursor-pointer
        ${
          selected
            ? isCritical
              ? "border-red-500 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              : "border-emerald-500 bg-emerald-500/5 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
            : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
        }
        ${isCritical && !selected ? "border-red-500/40 animate-[pulse_2s_ease-in-out_infinite]" : ""}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <LiveDot critical={isCritical} />
          <span className="text-[11px] font-mono text-slate-400">{device.label}</span>
        </div>
        {isCritical && (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
            <AlertTriangle className="w-3 h-3" />
            CRITICAL
          </span>
        )}
      </div>

      <p className="text-sm font-semibold text-white mb-0.5 truncate">{device.subject}</p>
      <p className="text-[11px] text-slate-500 mb-3">{device.location}</p>

      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <Thermometer
            className={`w-3.5 h-3.5 ${isCritical ? "text-red-400" : "text-emerald-400"}`}
          />
          <span
            className={`text-sm font-bold ${isCritical ? "text-red-400" : "text-white"}`}
          >
            {device.temperature}°C
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-sm font-bold text-white">{device.heartRate} bpm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-sm font-bold text-white">{device.activityLevel}%</span>
        </div>
      </div>
    </button>
  );
}

/** ERP Quick Action Card */
function ERPCard({ action, onClick }: { action: ERPAction; onClick: () => void }) {
  const Icon = action.icon;
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 w-56 rounded-xl p-4 border border-slate-700/50
        bg-gradient-to-br ${action.color}
        hover:border-slate-500 hover:scale-[1.02] active:scale-[0.98]
        transition-all duration-200 text-left group
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-slate-800/60 ${action.accent}`}>
          <Icon className="w-4 h-4" />
        </div>
        {action.count !== undefined && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800/80 ${action.accent}`}>
            {action.count}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-white mb-0.5 group-hover:text-white">
        {action.label}
      </p>
      <p className="text-[11px] text-slate-400">{action.sublabel}</p>
    </button>
  );
}

/** AI Risk level badge */
function RiskBadge({ level }: { level: AIAnalysisResult["riskLevel"] }) {
  const cfg = {
    LOW: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", icon: CheckCircle2 },
    MEDIUM: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", icon: AlertTriangle },
    HIGH: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30", icon: AlertTriangle },
    CRITICAL: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", icon: XCircle },
  }[level];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {level} RISK
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function MonitoringHub() {
  // ── State ──
  const [devices, setDevices] = useState<IoTDevice[]>(INITIAL_DEVICES);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("d-002");
  const [contextNote, setContextNote] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [erpPage, setErpPage] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [shimmerActive, setShimmerActive] = useState(false);
  const [erpNotification, setErpNotification] = useState<string | null>(null);

  const erpScrollRef = useRef<HTMLDivElement>(null);

  // ── Derived ──
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId)!;
  const isCritical = selectedDevice.temperature > 39.5;

  // ── IoT Live Feed Simulation ──────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices((prev) =>
        prev.map((device) => {
          const drift = (Math.random() - 0.48) * 0.15; // slight upward bias for drama
          const newTemp = parseFloat(
            Math.min(Math.max(device.temperature + drift, 37.0), 41.5).toFixed(1)
          );
          const bpmDrift = Math.round((Math.random() - 0.5) * 4);
          const newBpm = Math.min(Math.max(device.heartRate + bpmDrift, 50), 180);
          const actDrift = Math.round((Math.random() - 0.5) * 6);
          const newAct = Math.min(Math.max(device.activityLevel + actDrift, 5), 95);

          const now = new Date();
          const tsStr = `${now.getMinutes()}:${String(now.getSeconds()).padStart(2, "0")}`;

          const newReading: SensorReading = {
            ts: tsStr,
            temp: newTemp,
            bpm: newBpm,
            bpmScaled: parseFloat((newBpm / 10).toFixed(1)),
            activity: newAct,
          };

          const newHistory = [...device.history.slice(-19), newReading];

          return {
            ...device,
            temperature: newTemp,
            heartRate: newBpm,
            activityLevel: newAct,
            history: newHistory,
          };
        })
      );
      setLastUpdated(new Date());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // ── Auto-generate AI context from IoT anomaly ─────────────────
  const buildAutoContext = useCallback((device: IoTDevice): string => {
    const parts: string[] = [];
    if (device.temperature > 39.5)
      parts.push(`Temperature critically elevated at ${device.temperature}°C`);
    else if (device.temperature > 38.8)
      parts.push(`Temperature slightly elevated at ${device.temperature}°C`);
    if (device.activityLevel < 25)
      parts.push(`Activity severely reduced (${device.activityLevel}%)`);
    if (device.heartRate < 55 || device.heartRate > 100)
      parts.push(`Heart rate anomaly detected: ${device.heartRate} BPM`);
    return parts.join(". ") + (parts.length ? ". " : "");
  }, []);

  const autoContext = buildAutoContext(selectedDevice);

  // ── AI Risk Analysis (mocked LLM) ────────────────────────────
  const handleGenerateAnalysis = async () => {
    setIsAnalysing(true);
    setAiResult(null);
    setShimmerActive(true);

    // Simulate streaming delay
    await new Promise((r) => setTimeout(r, 2800));

    const level: AIAnalysisResult["riskLevel"] =
      selectedDevice.temperature > 39.5
        ? "CRITICAL"
        : selectedDevice.temperature > 38.9
        ? "MEDIUM"
        : "LOW";

    setAiResult(MOCK_AI_RESPONSES[level]);
    setIsAnalysing(false);
    setShimmerActive(false);
  };

  // ── ERP scroll ────────────────────────────────────────────────
  const scrollErp = (dir: "left" | "right") => {
    const el = erpScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 240 : -240, behavior: "smooth" });
    setErpPage((p) => (dir === "right" ? Math.min(p + 1, 2) : Math.max(p - 1, 0)));
  };

  const handleErpAction = (id: string) => {
    const msgs: Record<string, string> = {
      invoice: "Invoice panel opening…",
      payments: "Loading payment queue…",
      dispatch: "Routing vet to Sütaş Farm…",
    };
    setErpNotification(msgs[id] ?? "Action triggered");
    setTimeout(() => setErpNotification(null), 3000);
  };

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 text-white min-h-screen">

      {/* ══════════════════════════════════════════════
          TOP HEADER BAR
      ══════════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Radio className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Active Monitoring & AI Hub</h1>
            <p className="text-xs text-slate-500">Real-time IoT telemetry · AI triage · ERP actions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Updated{" "}
              {lastUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <LiveDot />
            <span className="text-emerald-400 font-medium">3 devices online</span>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ══════════════════════════════════════════════
            SECTION 1 — IoT HARDWARE FEED
        ══════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
              Live Sensor Feed
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                selected={device.id === selectedDeviceId}
                onSelect={() => {
                  setSelectedDeviceId(device.id);
                  setAiResult(null);
                }}
              />
            ))}
          </div>

          {/* ── Expanded Device Detail Panel ── */}
          <div
            className={`
              rounded-2xl border p-5 transition-all duration-500
              ${
                isCritical
                  ? "border-red-500/60 bg-gradient-to-br from-slate-900 via-red-950/10 to-slate-900 shadow-[0_0_40px_rgba(239,68,68,0.15)]"
                  : "border-slate-700/50 bg-slate-800/30"
              }
            `}
          >
            {/* Device header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <LiveDot critical={isCritical} />
                  <span className="text-xs font-mono text-slate-400">{selectedDevice.label}</span>
                  {isCritical && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-red-500 text-white rounded-full animate-pulse">
                      ⚠ CRITICAL ALERT
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white">{selectedDevice.subject}</h3>
                <p className="text-xs text-slate-500">{selectedDevice.location}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: "3s" }} />
                Live
              </div>
            </div>

            {/* Metric rings + sparklines */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              {/* Temperature */}
              <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Thermometer className={`w-4 h-4 ${isCritical ? "text-red-400" : "text-emerald-400"}`} />
                    <span className="text-xs font-semibold text-slate-300">Body Temperature</span>
                  </div>
                  <StatusRing
                    value={selectedDevice.temperature}
                    max={42}
                    label="Temp"
                    unit="°C"
                    warn={38.9}
                    critical={39.5}
                    color="#34d399"
                  />
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span
                    className={`text-3xl font-black ${isCritical ? "text-red-400" : "text-white"}`}
                  >
                    {selectedDevice.temperature}
                  </span>
                  <span className="text-slate-400 text-sm pb-1">°C</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">
                  Normal range: 37.5 – 39.2 °C
                </p>
                <SparkLine
                  data={selectedDevice.history}
                  dataKey="temp"
                  color={isCritical ? "#ef4444" : "#34d399"}
                  warnValue={39.5}
                />
              </div>

              {/* Heart Rate */}
              <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-semibold text-slate-300">Heart Rate</span>
                  </div>
                  <StatusRing
                    value={selectedDevice.heartRate}
                    max={200}
                    label="BPM"
                    unit="bpm"
                    warn={120}
                    critical={160}
                    color="#fb7185"
                  />
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-black text-white">{selectedDevice.heartRate}</span>
                  <span className="text-slate-400 text-sm pb-1">bpm</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">
                  Normal range: 60 – 120 bpm
                </p>
                <SparkLine data={selectedDevice.history} dataKey="bpm" color="#fb7185" />
              </div>

              {/* Activity Level */}
              <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-300">Activity Level</span>
                  </div>
                  <StatusRing
                    value={selectedDevice.activityLevel}
                    max={100}
                    label="Activity"
                    unit="%"
                    warn={0}
                    critical={0}
                    color="#fbbf24"
                  />
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span
                    className={`text-3xl font-black ${
                      selectedDevice.activityLevel < 25 ? "text-red-400" : "text-white"
                    }`}
                  >
                    {selectedDevice.activityLevel}
                  </span>
                  <span className="text-slate-400 text-sm pb-1">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">
                  {selectedDevice.activityLevel < 25
                    ? "⚠ Significantly below normal"
                    : selectedDevice.activityLevel < 50
                    ? "Moderately active"
                    : "Active"}
                </p>
                <ActivityBar value={selectedDevice.activityLevel} />
              </div>
            </div>

            {/* Composite chart */}
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-400">Temperature Trend (last 20 readings)</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-emerald-400 inline-block rounded" />
                    Temp °C
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-rose-400 inline-block rounded" />
                    BPM /10
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-px bg-red-500 inline-block border-dashed border-t border-red-500" />
                    39.5°C threshold
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart
                  data={selectedDevice.history}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="ts"
                    tick={{ fill: "#475569", fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: "#475569", fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[36, 42]}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <ReferenceLine y={39.5} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    stroke={isCritical ? "#ef4444" : "#34d399"}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bpmScaled"
                    name="BPM /10"
                    stroke="#fb7185"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    strokeDasharray="3 2"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            SECTION 2 — AI TRIAGE MODULE
        ══════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
              AI Triage Module
            </h2>
            <span className="text-[10px] text-slate-500 ml-auto">
              Powered by VetLoop LLM · Context-aware
            </span>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4">
            {/* Auto-extracted anomaly context */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider mb-2">
                Auto-extracted IoT Context
              </p>
              <div className="flex items-start gap-2">
                <div className="w-1 self-stretch rounded-full bg-violet-500/40" />
                <p className="text-sm text-slate-300 leading-relaxed">
                  {autoContext.trim()
                    ? autoContext
                    : "All vitals within normal range — no anomalies detected."}
                </p>
              </div>
              <p className="text-[10px] text-slate-600 mt-2">
                ↑ Pulled from {selectedDevice.label} · {selectedDevice.subject}
              </p>
            </div>

            {/* User-added context */}
            <div>
              <label className="block text-xs text-slate-400 mb-2 font-medium">
                Additional Clinical Observations
              </label>
              <textarea
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                placeholder={`Add observations for ${selectedDevice.subject}… e.g. "Animal refusing feed since morning, mild nasal discharge observed."`}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700/60 text-sm text-slate-200 placeholder-slate-600 p-3 resize-none focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition-all min-h-[80px]"
              />
            </div>

            {/* Full context preview */}
            <div className="rounded-xl bg-slate-900/60 border border-slate-700/30 p-3">
              <p className="text-[10px] text-slate-500 mb-1.5 font-mono">PROMPT PREVIEW</p>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                <span className="text-violet-400">[SYSTEM]</span> You are VetLoop AI, a clinical
                veterinary assistant.
                <br />
                <span className="text-violet-400">[CONTEXT]</span> {autoContext}
                {contextNote && <span className="text-emerald-400">{contextNote}</span>}
                <br />
                <span className="text-violet-400">[TASK]</span> Provide a structured risk analysis
                with recommendations.
              </p>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerateAnalysis}
              disabled={isAnalysing}
              className={`
                w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2
                ${
                  isAnalysing
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_30px_rgba(139,92,246,0.5)] active:scale-[0.98]"
                }
              `}
            >
              {isAnalysing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analysing — generating risk assessment…</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>Generate Risk Analysis</span>
                </>
              )}
            </button>

            {/* Shimmer placeholder while loading */}
            {shimmerActive && (
              <div className="space-y-2 animate-pulse">
                {[80, 60, 90, 50].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 rounded-full bg-slate-700/60"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            )}

            {/* AI Result */}
            {aiResult && !isAnalysing && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-violet-400" />
                    <span className="text-sm font-semibold text-white">VetLoop AI Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      Confidence: {aiResult.confidence}%
                    </span>
                    <div
                      className="h-1.5 w-16 bg-slate-700 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-1000"
                        style={{ width: `${aiResult.confidence}%` }}
                      />
                    </div>
                    <RiskBadge level={aiResult.riskLevel} />
                  </div>
                </div>

                {/* Summary */}
                <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-violet-500/40 pl-3">
                  {aiResult.summary}
                </p>

                {/* Recommendations */}
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Clinical Recommendations
                  </p>
                  <div className="space-y-2">
                    {aiResult.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-slate-300"
                      >
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                            aiResult.riskLevel === "CRITICAL"
                              ? "bg-red-500/20 text-red-400"
                              : aiResult.riskLevel === "MEDIUM"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                {aiResult.riskLevel === "CRITICAL" && (
                  <button className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all">
                    <Truck className="w-4 h-4" />
                    Dispatch Vet Immediately → {selectedDevice.location}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            SECTION 3 — FREELANCE VET ERP PANEL
        ══════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
                Freelance Vet ERP Quick Actions
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollErp("left")}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all disabled:opacity-30"
                disabled={erpPage === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === erpPage ? "w-4 bg-emerald-400" : "w-1.5 bg-slate-700"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => scrollErp("right")}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all disabled:opacity-30"
                disabled={erpPage === 2}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification toast */}
          {erpNotification && (
            <div className="mb-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-sm text-emerald-400 animate-pulse">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {erpNotification}
            </div>
          )}

          {/* Swipeable ERP card rail */}
          <div
            ref={erpScrollRef}
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {ERP_ACTIONS.map((action) => (
              <div key={action.id} className="snap-start flex-shrink-0">
                <ERPCard action={action} onClick={() => handleErpAction(action.id)} />
              </div>
            ))}

            {/* Stats summary card (bonus) */}
            <div className="snap-start flex-shrink-0 w-56 rounded-xl p-4 border border-slate-700/50 bg-slate-800/40">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">
                This Week
              </p>
              <div className="space-y-2.5">
                {[
                  { label: "Appointments", value: "12", icon: "📅" },
                  { label: "Revenue", value: "₺8,450", icon: "📈" },
                  { label: "Farms Served", value: "3", icon: "🐄" },
                  { label: "AI Triages", value: "27", icon: "🧠" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {stat.icon} {stat.label}
                    </span>
                    <span className="text-xs font-bold text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom breathing room */}
        <div className="h-8" />
      </div>
    </div>
  );
}
