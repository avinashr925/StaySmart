"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { authApi, paymentsApi, listingsApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  Users,
  Home,
  DollarSign,
  TrendingUp,
  Settings,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import toast from "react-hot-toast";

interface ISystemStats {
  totalUsers: number;
  totalListings: number;
  totalBookings: number;
  totalRevenue: number;
  platformCommission: number;
  pendingHostsCount: number;
}

interface IAuditLog {
  _id: string;
  user: {
    name: string;
    email: string;
  } | null;
  action: string;
  targetType: string;
  targetId: string;
  ipAddress: string;
  createdAt: string;
}

interface IListing {
  _id: string;
  title: string;
  city: string;
  price: number;
  moderationStatus: string;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please sign in to continue.");
      router.push("/login");
    }
  }, [user, authLoading]);
  const [stats, setStats] = useState<ISystemStats | null>(null);
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [listings, setListings] = useState<IListing[]>([]);
  const [flags, setFlags] = useState<{ [key: string]: boolean }>({});
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    if (!user || (user.role !== "Admin" && user.role !== "SuperAdmin")) return;
    setLoading(true);
    try {
      // 1) Fetch system statistics & logs from Admin API
      const statsRes = await fetch("http://localhost:8080/api/admin/analytics", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const statsJson = await statsRes.json();
      if (statsJson.status === "success") {
        setStats(statsJson.data.metrics);
      }

      const logsRes = await fetch("http://localhost:8080/api/admin/audit-logs", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const logsJson = await logsRes.json();
      if (logsJson.status === "success") {
        setLogs(logsJson.data.logs || []);
      }

      // 2) Fetch Listings for moderation
      const listingsRes = await listingsApi.getAll();
      if (listingsRes.status === "success") {
        setListings(listingsRes.data.listings || []);
      }

      // 3) Fetch Feature Flags
      const flagsRes = await fetch("http://localhost:8080/api/admin/feature-flags", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const flagsJson = await flagsRes.json();
      if (flagsJson.status === "success") {
        setFlags(flagsJson.data.flags || {});
      }

      // 4) Fetch Support Tickets
      const ticketsRes = await fetch("http://localhost:8080/api/admin/tickets", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const ticketsJson = await ticketsRes.json();
      if (ticketsJson.status === "success") {
        setTickets(ticketsJson.data.tickets || []);
      }
    } catch (err) {
      toast.error("Failed to load administrative system metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  // Handle moderate listing status
  const handleModerateListing = async (listingId: string, status: "Approved" | "Rejected") => {
    try {
      const res = await fetch(`http://localhost:8080/api/admin/listings/${listingId}/moderate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Listing status updated to ${status}`);
        fetchAdminData();
      } else {
        toast.error(data.message || "Failed to update listing status");
      }
    } catch (err) {
      toast.error("Network moderation query failed");
    }
  };

  // Toggle Feature Flags
  const handleToggleFlag = async (name: string, currentValue: boolean) => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/feature-flags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ name, value: !currentValue }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Feature flag "${name}" updated successfully`);
        fetchAdminData();
      }
    } catch (err) {
      toast.error("Failed to update feature flags");
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/admin/tickets/${ticketId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ status: "Resolved" }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Support ticket resolved successfully!");
        fetchAdminData();
      }
    } catch (err) {
      toast.error("Failed to resolve support ticket");
    }
  };

  if (!user || (user.role !== "Admin" && user.role !== "SuperAdmin")) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-32 text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto" />
          <h2 className="font-outfit text-2xl font-bold">Access Denied</h2>
          <p className="text-zinc-500 text-xs">This panel requires Admin or SuperAdmin permission levels.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <Settings className="w-6 h-6 text-indigo-500 animate-spin" />
          <div>
            <h1 className="font-outfit text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              System Control Dashboard
            </h1>
            <span className="text-xs text-zinc-500">Authorized: {user.role} Privilege Level</span>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-2xl text-blue-500">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-semibold block">TOTAL USERS</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{stats.totalUsers}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl text-emerald-500">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-semibold block">LISTINGS</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{stats.totalListings}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-violet-50 dark:bg-violet-950/20 rounded-2xl text-violet-500">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-semibold block">BOOKINGS</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{stats.totalBookings}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-2xl text-amber-500">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-semibold block">SYSTEM REVENUE</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">₹{stats.totalRevenue.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm flex items-center gap-4 col-span-2 md:col-span-1">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-2xl text-rose-500">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-semibold block">COMMISSIONS (8%)</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">₹{(stats.platformCommission || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Listings Moderation Board */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="font-outfit text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Property Moderation & Approvals</span>
            </h2>

            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {listings.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">No properties in system.</div>
              ) : (
                listings.map((l) => (
                  <div key={l._id} className="p-4 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-semibold block text-zinc-800 dark:text-zinc-100">{l.title}</span>
                      <span className="text-xs text-zinc-400">{l.city} • ₹{l.price}/night</span>
                      <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        l.moderationStatus === "Approved" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600" :
                        l.moderationStatus === "Rejected" ? "bg-red-100 dark:bg-red-950/40 text-red-600" :
                        "bg-amber-100 dark:bg-amber-950/40 text-amber-600"
                      }`}>{l.moderationStatus || "Approved"}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleModerateListing(l._id, "Approved")}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-500 rounded-xl transition"
                        title="Approve Listing"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleModerateListing(l._id, "Rejected")}
                        className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-500 rounded-xl transition"
                        title="Reject Listing"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Feature Flags & System Config Panel */}
          <div className="space-y-6">
            <h2 className="font-outfit text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              <span>Feature Flags Management</span>
            </h2>

            <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm space-y-4">
              <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Global Toggles</span>
              
              {Object.keys(flags).map((flagName) => (
                <div key={flagName} className="flex justify-between items-center py-2 text-xs">
                  <div>
                    <span className="font-semibold block">{flagName}</span>
                    <span className="text-[10px] text-zinc-400">Controls backend routing conditions</span>
                  </div>
                  <button
                    onClick={() => handleToggleFlag(flagName, flags[flagName])}
                    className="text-zinc-500 focus:outline-none transition"
                  >
                    {flags[flagName] ? (
                      <ToggleRight className="w-8 h-8 text-indigo-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-zinc-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Support Tickets Section */}
        <div className="space-y-4">
          <h2 className="font-outfit text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
            <span>Support Requests & Dispute Tickets</span>
          </h2>

          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm">
            {tickets.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">No support requests filed.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-950 text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="p-4 font-bold">Subject</th>
                      <th className="p-4 font-bold">User</th>
                      <th className="p-4 font-bold">Message</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {tickets.map((t) => (
                      <tr key={t._id}>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{t.subject}</td>
                        <td className="p-4">{t.user?.name || "Anonymous"} ({t.user?.email || "N/A"})</td>
                        <td className="p-4 max-w-xs truncate">{t.message}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            t.status === "Resolved" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600" : "bg-amber-100 dark:bg-amber-950/40 text-amber-600"
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {t.status === "Open" && (
                            <button
                              onClick={() => handleResolveTicket(t._id)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-indigo-500 rounded-lg text-[10px] font-bold transition"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Audit Log Table section */}
        <div className="space-y-4">
          <h2 className="font-outfit text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <span>Audit Logs Table</span>
          </h2>

          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950 text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="p-4 font-bold">Action</th>
                    <th className="p-4 font-bold">Target</th>
                    <th className="p-4 font-bold">Operator</th>
                    <th className="p-4 font-bold">IP Address</th>
                    <th className="p-4 font-bold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{log.action}</td>
                      <td className="p-4">{log.targetType} ({log.targetId.substring(0, 8)})</td>
                      <td className="p-4">{log.user?.name || "System"}</td>
                      <td className="p-4 font-mono">{log.ipAddress}</td>
                      <td className="p-4 text-zinc-400">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
