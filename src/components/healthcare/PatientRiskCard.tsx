'use client'

import React from 'react'
import { riskLevelColor, riskLevelEmoji, type RiskLevel } from '@/lib/healthcare/risk-scorer'
import { AlertTriangle, Brain, Pill, ShieldAlert, TrendingUp, RefreshCw, Loader2 } from 'lucide-react'

interface PatientRiskProfile {
  risk_level: RiskLevel
  risk_score: number
  chronic_conditions: string[]
  medication_history: Array<{ name: string; dosage?: string; dateMentioned: string }>
  allergy_flags: string[]
  ai_alerts: Array<{ message: string; severity: RiskLevel; triggeredAt: string }>
  ai_summary: string
  total_consultations: number
  visit_frequency_score: number
  last_analyzed_at: string | null
}

interface PatientRiskCardProps {
  profile: PatientRiskProfile | null
  contactId: string
  isLoading?: boolean
  onRefresh?: () => void
}

export function PatientRiskCard({ profile, contactId, isLoading, onRefresh }: PatientRiskCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading risk profile…</span>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3">
        <div className="flex items-center gap-2 text-slate-400">
          <Brain className="w-5 h-5" />
          <span className="text-sm font-medium">No Risk Profile Yet</span>
        </div>
        <p className="text-xs text-slate-500">
          Analyze at least one consultation note to generate this patient's AI risk profile.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Generate Profile
          </button>
        )}
      </div>
    )
  }

  const colorClass = riskLevelColor(profile.risk_level)
  const emoji = riskLevelEmoji(profile.risk_level)
  const criticalAlerts = profile.ai_alerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'high',
  )

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
      {/* Risk Level Header */}
      <div className={`px-5 py-4 border-b border-slate-800 flex items-center justify-between ${colorClass.split(' ')[1]} ${colorClass.split(' ')[2]}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">AI Risk Level</div>
            <div className={`text-xl font-black capitalize ${colorClass.split(' ')[0]}`}>
              {profile.risk_level}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-black ${colorClass.split(' ')[0]}`}>
            {Math.round(profile.risk_score)}
          </div>
          <div className="text-xs text-slate-500">/ 100</div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* AI Summary */}
        {profile.ai_summary && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Brain className="w-3.5 h-3.5" />
              AI Clinical Summary
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{profile.ai_summary}</p>
          </div>
        )}

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5" />
              Active Alerts
            </div>
            <div className="space-y-2">
              {criticalAlerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300"
                >
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                  {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chronic Conditions */}
        {profile.chronic_conditions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Conditions
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.chronic_conditions.map((c, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Medications */}
        {profile.medication_history.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Pill className="w-3.5 h-3.5" />
              Medication History
            </div>
            <div className="space-y-1">
              {profile.medication_history.slice(0, 5).map((m, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{m.name}</span>
                  {m.dosage && <span className="text-slate-500">{m.dosage}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Allergy flags */}
        {profile.allergy_flags.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              ⚠️ Allergies
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.allergy_flags.map((a, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-medium"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{profile.total_consultations}</div>
            <div className="text-xs text-slate-500">Consultations</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {Math.round(profile.visit_frequency_score)}%
            </div>
            <div className="text-xs text-slate-500">Visit Compliance</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          {profile.last_analyzed_at && (
            <span className="text-xs text-slate-600">
              Analyzed {new Date(profile.last_analyzed_at).toLocaleDateString('en-ZA')}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
