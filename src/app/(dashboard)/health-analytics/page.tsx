'use client'

import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Activity, AlertTriangle, Brain, TrendingUp, Users, ClipboardList,
  MessageSquare, Calendar, RefreshCw, Loader2,
} from 'lucide-react'

interface DashboardStats {
  riskDistribution: { low: number; medium: number; high: number; critical: number }
  highRiskPatients: Array<{ contactId: string; riskLevel: string; riskScore: number; conditions: string[]; summary: string }>
  topConditions: Array<{ name: string; count: number }>
  notesOverTime: Array<{ date: string; count: number }>
  noteTypeBreakdown: Record<string, number>
  recentAlerts: Array<{ symptom: string; severity: string; noteId: string; date: string }>
  journeyStats: { active: number; completed: number; total: number }
  upcomingLoad: Array<{ date: string; count: number }>
  totalNotes: number
  totalPatients: number
  totalUpcomingAppointments: number
}

const RISK_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444']

export default function HealthAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/healthcare/dashboard-stats')
      const data = await res.json()
      setStats(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm">Loading clinic intelligence…</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500 text-sm">
        Failed to load analytics. Please refresh.
      </div>
    )
  }

  const riskPieData = [
    { name: 'Low', value: stats.riskDistribution.low },
    { name: 'Medium', value: stats.riskDistribution.medium },
    { name: 'High', value: stats.riskDistribution.high },
    { name: 'Critical', value: stats.riskDistribution.critical },
  ].filter((d) => d.value > 0)

  const totalPatientsByRisk =
    stats.riskDistribution.low +
    stats.riskDistribution.medium +
    stats.riskDistribution.high +
    stats.riskDistribution.critical

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 sticky top-0 z-30 bg-slate-950/95 backdrop-blur px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Clinic Intelligence</h1>
              <p className="text-xs text-slate-500">AI-powered analytics — last 30 days</p>
            </div>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Notes (30d)', value: stats.totalNotes, icon: <ClipboardList className="w-5 h-5 text-indigo-400" />, color: 'indigo' },
            { label: 'Patients Profiled', value: totalPatientsByRisk, icon: <Users className="w-5 h-5 text-violet-400" />, color: 'violet' },
            { label: 'Active Care Journeys', value: stats.journeyStats.active, icon: <MessageSquare className="w-5 h-5 text-emerald-400" />, color: 'emerald' },
            { label: 'Upcoming Appointments', value: stats.totalUpcomingAppointments, icon: <Calendar className="w-5 h-5 text-amber-400" />, color: 'amber' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3`}>
              <div className="flex items-center justify-between">
                {icon}
                <span className="text-3xl font-black text-white">{value}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Recent Alerts */}
        {stats.recentAlerts.length > 0 && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h2 className="text-sm font-bold text-red-300 uppercase tracking-wider">
                Active High-Risk Alerts (Last 7 Days)
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats.recentAlerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                  }`} />
                  <div>
                    <p className="text-sm text-red-300 font-medium">{alert.symptom}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(alert.date).toLocaleDateString('en-ZA')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Risk Distribution Pie */}
          {riskPieData.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Patient Risk Distribution
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={riskPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {riskPieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Conditions */}
          {stats.topConditions.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Top Conditions
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.topConditions} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={120} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Notes Over Time */}
        {stats.notesOverTime.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-400" />
              Consultation Volume (30 Days)
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.notesOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* High Risk Patients */}
        {stats.highRiskPatients.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-red-400" />
              High-Risk Patients
            </h2>
            <div className="space-y-3">
              {stats.highRiskPatients.map((p, i) => (
                <div
                  key={i}
                  className={`flex items-start justify-between gap-4 p-4 rounded-xl border ${
                    p.riskLevel === 'critical'
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-orange-500/5 border-orange-500/20'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold capitalize ${
                        p.riskLevel === 'critical'
                          ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                          : 'text-orange-400 bg-orange-500/10 border border-orange-500/30'
                      }`}>
                        {p.riskLevel}
                      </span>
                      <span className="text-xs text-slate-500">Score: {Math.round(p.riskScore)}/100</span>
                    </div>
                    {p.conditions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.conditions.slice(0, 4).map((c, j) => (
                          <span key={j} className="text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    {p.summary && (
                      <p className="text-xs text-slate-400 line-clamp-2">{p.summary}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Appointment Load */}
        {stats.upcomingLoad.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Upcoming Appointment Load (14 Days)
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.upcomingLoad}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
