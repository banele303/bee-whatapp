'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ConsultationRecorder } from '@/components/healthcare/ConsultationRecorder'
import { AIInsightPanel } from '@/components/healthcare/AIInsightPanel'
import { ArrowLeft, Save, FileDown, Play, Loader2, Tag, CheckCircle2, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ClinicalNote {
  id: string
  title: string
  note_type: string
  status: string
  raw_transcript: string | null
  soap_note: Record<string, string> | null
  ai_suggestions: Array<{ type: string; content: string; confidence: number }>
  action_items: Array<{ text: string; assignee_type: string; done: boolean }>
  red_flags: Array<{ symptom: string; severity: string; recommendation: string }>
  tags: string[]
  contact_id: string | null
  pdf_url: string | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function NoteEditorPage({ params }: PageProps) {
  const [noteId, setNoteId] = useState<string | null>(null)
  const [note, setNote] = useState<ClinicalNote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [transcript, setTranscript] = useState('')
  const [title, setTitle] = useState('')
  const [noteType, setNoteType] = useState('consultation')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isTriggeringJourney, setIsTriggeringJourney] = useState(false)
  const [journeyDone, setJourneyDone] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resolve params
  useEffect(() => {
    params.then((p) => setNoteId(p.id))
  }, [params])

  // Fetch note on mount
  useEffect(() => {
    if (!noteId) return
    setIsLoading(true)
    fetch(`/api/healthcare/notes/${noteId}`)
      .then((r) => r.json())
      .then(({ note }) => {
        if (note) {
          setNote(note)
          setTranscript(note.raw_transcript ?? '')
          setTitle(note.title ?? 'Consultation Note')
          setNoteType(note.note_type ?? 'consultation')
          setTags(note.tags ?? [])
        }
      })
      .finally(() => setIsLoading(false))
  }, [noteId])

  // Auto-save transcript on change
  const handleTranscriptChange = (value: string) => {
    setTranscript(value)
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveNote({ raw_transcript: value }), 2000)
  }

  const saveNote = async (fields: Record<string, unknown> = {}) => {
    if (!noteId) return
    setIsSaving(true)
    try {
      const body = {
        title,
        note_type: noteType,
        raw_transcript: transcript,
        tags,
        ...fields,
      }
      const res = await fetch(`/api/healthcare/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleAnalysisComplete = (updatedNote: Record<string, unknown>) => {
    if (updatedNote) {
      setNote((prev) => (prev ? { ...prev, ...updatedNote } : null))
    }
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const newTags = [...tags, tagInput.trim().toLowerCase()]
      setTags(newTags)
      setTagInput('')
      saveNote({ tags: newTags })
    }
  }

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove)
    setTags(newTags)
    saveNote({ tags: newTags })
  }

  const triggerCareJourney = async () => {
    if (!note?.contact_id) return
    setIsTriggeringJourney(true)
    try {
      const res = await fetch('/api/healthcare/care-journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: note.contact_id,
          noteId,
          procedureType: noteType,
        }),
      })
      if (res.ok) {
        setJourneyDone(true)
      }
    } finally {
      setIsTriggeringJourney(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-muted-foreground p-6">
        <ClipboardList className="w-12 h-12" />
        <p className="text-sm font-semibold text-foreground">Note not found.</p>
        <Link href="/health-notes" className="text-primary hover:underline text-xs">
          ← Back to Clinical Notes
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-foreground">
      {/* Top Header Bar - mobile friendly flex wrapping */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/health-notes"
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0 border border-border"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveNote()}
            className="bg-transparent text-lg sm:text-xl font-bold text-foreground border-none outline-none placeholder:text-muted-foreground min-w-0 flex-1"
            placeholder="Note title…"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Save status */}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {isSaving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}

          {/* Note type */}
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            className="bg-background border border-input rounded-xl text-xs sm:text-sm text-foreground px-3 py-2 outline-none focus:border-primary"
          >
            <option value="consultation">Consultation</option>
            <option value="treatment_plan">Treatment Plan</option>
            <option value="post_procedure">Post-Procedure</option>
            <option value="referral">Referral</option>
            <option value="follow_up">Follow-Up</option>
            <option value="general">General</option>
          </select>

          <Button
            onClick={() => saveNote()}
            disabled={isSaving}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 rounded-xl h-9"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Editor (3 cols) vs Right AI Insights (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Transcript Editor */}
        <div className="lg:col-span-3 space-y-5">
          {/* Voice Recorder */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">🎙️ Voice Recording</h2>
            <ConsultationRecorder
              noteId={note.id}
              onTranscriptUpdated={setTranscript}
            />
          </div>

          {/* Transcript */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">📝 Consultation Transcript</h2>
            <textarea
              value={transcript}
              onChange={(e) => handleTranscriptChange(e.target.value)}
              placeholder="Type or paste the consultation transcript here. Voice notes you record above will be appended automatically…"
              rows={14}
              className="w-full bg-background border border-input rounded-xl p-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed focus:border-primary font-mono"
            />
          </div>

          {/* Tags */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-primary" /> Tags
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => removeTag(tag)}
                  className="px-2.5 py-1 rounded-full bg-secondary border border-border text-xs text-foreground hover:border-destructive hover:text-destructive transition-all"
                >
                  {tag} ×
                </button>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag + Enter"
                className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none border-b border-border px-1 py-1"
              />
            </div>
          </div>

          {/* Care Journey Button */}
          {note.contact_id && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3">
              <h2 className="text-xs font-bold text-primary uppercase tracking-wider">
                📱 Post-Consultation Care Journey
              </h2>
              <p className="text-xs text-muted-foreground">
                Mark this consultation complete and trigger an automated WhatsApp care sequence (Day 0, 1, 3, 7, 30) for this patient.
              </p>
              {journeyDone ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs sm:text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Care journey triggered! Patient will receive follow-up messages.
                </div>
              ) : (
                <Button
                  onClick={triggerCareJourney}
                  disabled={isTriggeringJourney}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-2 rounded-xl"
                >
                  {isTriggeringJourney ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting…</>
                  ) : (
                    <><Play className="w-3.5 h-3.5" /> Complete & Start Care Journey</>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right — AI Insights */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            🤖 AI Clinical Insights
          </h2>
          <AIInsightPanel
            noteId={note.id}
            soapNote={note.soap_note as any}
            aiSuggestions={(note.ai_suggestions ?? []) as any}
            redFlags={(note.red_flags ?? []) as any}
            actionItems={(note.action_items ?? []) as any}
            rawTranscript={transcript}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </div>
      </div>
    </div>
  )
}
