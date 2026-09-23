'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, ClipboardList, Loader2, CheckCircle2, Clock, Archive, FileText, Mic, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ClinicalNote {
  id: string
  title: string
  note_type: string
  status: string
  tags: string[]
  created_at: string
  updated_at: string
  contact_id: string | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-muted-foreground bg-muted border-border',
  in_progress: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  complete: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  archived: 'text-muted-foreground/60 bg-muted/40 border-border',
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  consultation: '🩺 Consultation',
  treatment_plan: '📋 Treatment Plan',
  post_procedure: '🩹 Post-Procedure',
  referral: '🏥 Referral',
  follow_up: '🔄 Follow-Up',
  general: '📝 General',
}

export default function HealthNotesPage() {
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchNotes = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filterType) params.set('note_type', filterType)
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/healthcare/notes?${params}`)
      const data = await res.json()
      setNotes(data.notes ?? [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchNotes() }, [filterType, filterStatus])

  const createNote = async () => {
    setIsCreating(true)
    try {
      const res = await fetch('/api/healthcare/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Consultation Note', note_type: 'consultation' }),
      })
      const data = await res.json()
      if (data.note?.id) {
        window.location.href = `/health-notes/${data.note.id}`
      }
    } finally {
      setIsCreating(false)
    }
  }

  const filteredNotes = notes.filter((n) =>
    !search ||
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Clinical Notes</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">AI-powered consultation documentation & history</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/session" className="flex-1 sm:flex-none">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold gap-1.5 rounded-xl h-10"
            >
              <Mic className="w-3.5 h-3.5 text-primary" />
              Live Session
            </Button>
          </Link>

          <Button
            onClick={createNote}
            disabled={isCreating}
            size="sm"
            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 rounded-xl h-10 shadow-sm"
          >
            {isCreating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
            ) : (
              <><Plus className="w-4 h-4" /> New Note</>
            )}
          </Button>
        </div>
      </div>

      {/* Filters - responsive mobile layout */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes or tags…"
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-background border border-input rounded-xl text-xs sm:text-sm text-foreground px-3 py-2.5 outline-none focus:border-primary"
          >
            <option value="">All Types</option>
            <option value="consultation">Consultation</option>
            <option value="treatment_plan">Treatment Plan</option>
            <option value="post_procedure">Post-Procedure</option>
            <option value="referral">Referral</option>
            <option value="follow_up">Follow-Up</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-background border border-input rounded-xl text-xs sm:text-sm text-foreground px-3 py-2.5 outline-none focus:border-primary"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Notes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-16 space-y-4 bg-card/40 rounded-2xl border border-dashed border-border p-6">
          <ClipboardList className="w-12 h-12 text-muted-foreground/50 mx-auto" />
          <div className="text-muted-foreground text-sm">
            {search ? 'No notes match your search criteria.' : 'No clinical notes yet.'}
          </div>
          {!search && (
            <Button
              onClick={createNote}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm"
            >
              Create your first note
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <Link
              key={note.id}
              href={`/health-notes/${note.id}`}
              className="block rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-card/90 transition-all p-4 sm:p-5 group shadow-xs hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                    <span className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                      {note.title}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                      {NOTE_TYPE_LABELS[note.note_type] ?? note.note_type}
                    </span>
                    {note.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[11px] text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${STATUS_COLORS[note.status] ?? ''}`}>
                    {note.status === 'in_progress' ? (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> In Progress</span>
                    ) : note.status === 'complete' ? (
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Complete</span>
                    ) : note.status === 'archived' ? (
                      <span className="flex items-center gap-1"><Archive className="w-3 h-3" /> Archived</span>
                    ) : (
                      note.status
                    )}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
