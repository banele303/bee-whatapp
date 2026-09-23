import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export interface ClinicalNoteRecord {
  id: string
  account_id: string
  title: string
  note_type: string
  contact_id?: string | null
  appointment_id?: string | null
  conversation_id?: string | null
  raw_transcript?: string | null
  soap_note?: Record<string, any> | null
  ai_suggestions?: Array<{ type: string; content: string; confidence: number }>
  action_items?: Array<{ text: string; assignee_type: string; done: boolean }>
  red_flags?: Array<{ symptom: string; severity: string; recommendation: string }>
  tags: string[]
  status: string
  clinician_id?: string | null
  pdf_url?: string | null
  created_at: string
  updated_at: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const NOTES_FILE = path.join(DATA_DIR, 'clinical_notes.json')

function ensureFile(): ClinicalNoteRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(NOTES_FILE)) {
      fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2), 'utf8')
      return []
    }
    const raw = fs.readFileSync(NOTES_FILE, 'utf8')
    return JSON.parse(raw) as ClinicalNoteRecord[]
  } catch (e) {
    console.warn('[notes-store] File read error:', e)
    return []
  }
}

function saveFile(notes: ClinicalNoteRecord[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf8')
  } catch (e) {
    console.error('[notes-store] File write error:', e)
  }
}

export const localNotesStore = {
  list(accountId?: string, filters?: { contactId?: string | null; noteType?: string | null; status?: string | null; limit?: number; offset?: number }) {
    let notes = ensureFile()
    if (accountId) {
      notes = notes.filter((n) => !n.account_id || n.account_id === accountId)
    }
    if (filters?.contactId) {
      notes = notes.filter((n) => n.contact_id === filters.contactId)
    }
    if (filters?.noteType) {
      notes = notes.filter((n) => n.note_type === filters.noteType)
    }
    if (filters?.status) {
      notes = notes.filter((n) => n.status === filters.status)
    }
    notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const offset = filters?.offset ?? 0
    const limit = filters?.limit ?? 50
    return {
      notes: notes.slice(offset, offset + limit),
      total: notes.length,
    }
  },

  get(id: string, accountId?: string) {
    const notes = ensureFile()
    return notes.find((n) => n.id === id && (!accountId || !n.account_id || n.account_id === accountId)) ?? null
  },

  create(data: Partial<ClinicalNoteRecord> & { title: string; note_type: string; account_id?: string; clinician_id?: string }) {
    const notes = ensureFile()
    const now = new Date().toISOString()
    const newNote: ClinicalNoteRecord = {
      id: data.id || randomUUID(),
      account_id: data.account_id || 'default-account',
      title: data.title,
      note_type: data.note_type,
      contact_id: data.contact_id || null,
      appointment_id: data.appointment_id || null,
      conversation_id: data.conversation_id || null,
      raw_transcript: data.raw_transcript || null,
      soap_note: data.soap_note || {},
      ai_suggestions: data.ai_suggestions || [],
      action_items: data.action_items || [],
      red_flags: data.red_flags || [],
      tags: data.tags || ['session-recorded'],
      status: data.status || 'draft',
      clinician_id: data.clinician_id || null,
      pdf_url: data.pdf_url || null,
      created_at: now,
      updated_at: now,
    }

    notes.unshift(newNote)
    saveFile(notes)
    return newNote
  },

  update(id: string, updates: Partial<ClinicalNoteRecord>, accountId?: string) {
    const notes = ensureFile()
    const idx = notes.findIndex((n) => n.id === id && (!accountId || !n.account_id || n.account_id === accountId))
    if (idx === -1) return null

    notes[idx] = {
      ...notes[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    saveFile(notes)
    return notes[idx]
  },

  delete(id: string, accountId?: string) {
    const notes = ensureFile()
    const filtered = notes.filter((n) => !(n.id === id && (!accountId || !n.account_id || n.account_id === accountId)))
    saveFile(filtered)
    return true
  },
}
