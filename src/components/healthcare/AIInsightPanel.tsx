'use client'

import React, { useState } from 'react'
import { Loader2, Wand2, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

interface SOAPNote {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

interface AISuggestion {
  type: 'medication' | 'referral' | 'follow_up' | 'alert' | 'test'
  content: string
  confidence: number
}

interface RedFlag {
  symptom: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
}

interface ActionItem {
  text: string
  assignee_type: 'clinician' | 'patient' | 'admin'
  due_date?: string
  done: boolean
}

interface AIInsightPanelProps {
  noteId: string
  soapNote: SOAPNote | null
  aiSuggestions: AISuggestion[]
  redFlags: RedFlag[]
  actionItems: ActionItem[]
  rawTranscript: string
  onAnalysisComplete: (updatedNote: Record<string, unknown>) => void
}

const SUGGESTION_ICONS: Record<string, string> = {
  medication: '💊',
  referral: '🏥',
  follow_up: '📅',
  alert: '⚠️',
  test: '🔬',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
}

export function AIInsightPanel({
  noteId,
  soapNote,
  aiSuggestions,
  redFlags,
  actionItems,
  rawTranscript,
  onAnalysisComplete,
}: AIInsightPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['soap', 'flags', 'suggestions']),
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const runAnalysis = async () => {
    if (!rawTranscript?.trim()) {
      setError('Please add a transcript before running AI analysis.')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await fetch(`/api/healthcare/notes/${noteId}/analyze`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Analysis failed')
      }
      const data = await res.json()
      onAnalysisComplete(data.note)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const hasSoap = soapNote && Object.values(soapNote).some((v) => v && v !== 'Not documented.')
  const hasData = hasSoap || redFlags.length > 0 || aiSuggestions.length > 0 || actionItems.length > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Analyze Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing with AI…
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              {hasData ? 'Re-Analyze with AI' : 'Analyze with AI'}
            </>
          )}
        </button>
        {hasData && !isAnalyzing && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            Analysis ready
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!hasData && !isAnalyzing && (
        <p className="text-xs text-slate-500">
          Click <strong>Analyze with AI</strong> to generate a SOAP note, clinical suggestions, and action items from the transcript.
        </p>
      )}

      {/* Red Flags — Always show if present */}
      {redFlags.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('flags')}
            className="flex items-center justify-between w-full text-xs font-semibold text-red-400 uppercase tracking-wider"
          >
            <span>⚠️ Red Flags ({redFlags.length})</span>
            {expandedSections.has('flags') ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.has('flags') && (
            <div className="space-y-2">
              {redFlags.map((flag, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${SEVERITY_COLORS[flag.severity] ?? ''}`}
                >
                  <div className="font-semibold">{flag.symptom}</div>
                  <div className="opacity-80">{flag.recommendation}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SOAP Note */}
      {hasSoap && soapNote && (
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('soap')}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            <span>📋 SOAP Note</span>
            {expandedSections.has('soap') ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.has('soap') && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              {(['subjective', 'objective', 'assessment', 'plan'] as const).map((section) => (
                <div key={section} className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {section}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {soapNote[section] || <span className="text-slate-600 italic">Not documented</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('suggestions')}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            <span>🤖 AI Suggestions ({aiSuggestions.length})</span>
            {expandedSections.has('suggestions') ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.has('suggestions') && (
            <div className="space-y-2">
              {aiSuggestions.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs"
                >
                  <span className="text-base">{SUGGESTION_ICONS[s.type] ?? '💡'}</span>
                  <div className="flex-1">
                    <div className="text-slate-300">{s.content}</div>
                    <div className="text-slate-600 mt-1">
                      Confidence: {Math.round(s.confidence * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => toggleSection('actions')}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            <span>✅ Action Items ({actionItems.length})</span>
            {expandedSections.has('actions') ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.has('actions') && (
            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs"
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 shrink-0 ${
                    item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                  }`}>
                    {item.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </span>
                  <div className="flex-1">
                    <div className={`text-slate-300 ${item.done ? 'line-through opacity-50' : ''}`}>
                      {item.text}
                    </div>
                    <div className="text-slate-600 mt-0.5 capitalize">
                      {item.assignee_type}
                      {item.due_date && ` · Due ${item.due_date}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
