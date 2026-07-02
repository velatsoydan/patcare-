import { useState } from "react";
import MonitoringHub from "./components/MonitoringHub";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Radio,
  FolderOpen,
  Settings,
  Search,
  CalendarIcon,
  TrendingUp,
  AlertTriangle,
  Send,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const revenueData = [
  { month: "Jan", revenue: 95000 },
  { month: "Feb", revenue: 105000 },
  { month: "Mar", revenue: 115000 },
  { month: "Apr", revenue: 125000 },
  { month: "May", revenue: 135000 },
  { month: "Jun", revenue: 145250 },
];

const aiTriageData = [
  { disease: "Mastitis", cases: 24 },
  { disease: "Rabies Vaccine Due", cases: 18 },
  { disease: "Lameness", cases: 15 },
  { disease: "Respiratory", cases: 12 },
  { disease: "Digestive", cases: 9 },
];

const appointments = [
  { id: 1, name: "Golden Retriever (Tarçın)", service: "Vaccination", type: "Pet Care", time: "10:00 AM", status: "upcoming" },
  { id: 2, name: "Sütaş Dairy Farm", service: "Herd Checkup", type: "Livestock B2B", time: "14:00 PM", status: "upcoming" },
  { id: 3, name: "Persian Cat (Luna)", service: "General Exam", type: "Pet Care", time: "16:30 PM", status: "upcoming" },
];

const iotAlerts = [
  { id: 1, message: "Cattle #842 High Temperature (39.5°C)", location: "Barn 3", severity: "critical", time: "2 min ago" },
  { id: 2, message: "Low Feed Level Detected", location: "Barn 1", severity: "warning", time: "15 min ago" },
  { id: 3, message: "Water Tank Level Normal", location: "Barn 2", severity: "info", time: "1 hour ago" },
];

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeNav, setActiveNav] = useState("dashboard");

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "appointments", icon: Calendar, label: "Appointments" },
    { id: "invoices", icon: FileText, label: "Invoices" },
    { id: "iot", icon: Radio, label: "IoT Herd Sensors" },
    { id: "records", icon: FolderOpen, label: "Patient Records" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Left Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? "w-20" : "w-64"
        } bg-[#0F172A] transition-all duration-300 flex flex-col border-r border-slate-800`}
      >
        <div className="p-6 flex items-center justify-between">
          {!sidebarCollapsed && (
            <h1 className="text-white text-xl">VetLoop</h1>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-white/70 hover:text-white"
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  activeNav === item.id
                    ? "bg-[#10B981] text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search patients, farms, invoices..."
                className="pl-10 bg-slate-50 border-slate-200"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">June 9, 2026</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-[#10B981] text-white">VS</AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm text-slate-900">Dr. Velat Soydan</p>
              <p className="text-xs text-slate-500">Veterinary Director</p>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-8" style={activeNav === "iot" ? { padding: 0 } : undefined}>
          {activeNav === "iot" ? (
            <MonitoringHub />
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-auto">
            {/* Card 1 - Financial Overview (Wide - 2 columns) */}
            <Card className="lg:col-span-2 shadow-sm border-slate-100">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Monthly Revenue</CardTitle>
                    <CardDescription>Financial performance overview</CardDescription>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12.5%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <p className="text-4xl text-[#0F172A]">₺145,250.00</p>
                  <p className="text-sm text-slate-500 mt-1">Last 6 months trend</p>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Card 2 - Live IoT Alerts */}
            <Card className="shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-rose-500" />
                  Real-Time Sensor Alerts
                </CardTitle>
                <CardDescription>Live farm monitoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {iotAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.severity === "critical"
                        ? "bg-rose-50 border-rose-200"
                        : alert.severity === "warning"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {alert.severity === "critical" && (
                        <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 mb-1">
                          {alert.severity === "critical" && "⚠️ "}
                          {alert.location}: {alert.message}
                        </p>
                        <p className="text-xs text-slate-500">{alert.time}</p>
                      </div>
                    </div>
                    {alert.severity === "critical" && (
                      <Button className="w-full mt-3 bg-[#10B981] hover:bg-[#059669]" size="sm">
                        Dispatch Vet
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Card 3 - Today's Appointments (Wide - 2 columns) */}
            <Card className="lg:col-span-2 shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle>Today's Appointments</CardTitle>
                <CardDescription>Scheduled consultations and checkups</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient / Client</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>{apt.name}</TableCell>
                        <TableCell className="text-slate-600">{apt.service}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              apt.type === "Pet Care"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }
                          >
                            {apt.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">{apt.time}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Card 4 - Quick Invoice */}
            <Card className="shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle>Quick Invoice</CardTitle>
                <CardDescription>Generate instant billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-slate-700 mb-2 block">Client Name</label>
                  <Input placeholder="Enter client name" />
                </div>
                <div>
                  <label className="text-sm text-slate-700 mb-2 block">Amount (₺)</label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm text-slate-700 mb-2 block">Service Description</label>
                  <Input placeholder="e.g., Vaccination, Checkup" />
                </div>
                <Button className="w-full bg-[#10B981] hover:bg-[#059669] gap-2">
                  <Send className="w-4 h-4" />
                  Send Invoice
                </Button>
              </CardContent>
            </Card>

            {/* Card 5 - AI Triage Insights (Full Width - 3 columns) */}
            <Card className="lg:col-span-3 shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle>AI Triage Insights</CardTitle>
                <CardDescription>Most common conditions detected in the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={aiTriageData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis dataKey="disease" type="category" tick={{ fill: "#64748b", fontSize: 12 }} width={150} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="cases" fill="#10B981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          )}
        </main>
      </div>
    </div>
  );
}
