'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Mic,
  Square,
  Sparkles,
  Save,
  AlertTriangle,
  Clock,
  UploadCloud,
  RefreshCw,
  Copy,
  ChevronRight,
  ClipboardList,
  Activity,
  Check,
  Stethoscope,
  Volume2,
  FileDown,
  Search,
  Plus,
  Play,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  Tag,
  SlidersHorizontal,
  ExternalLink,
  ShieldAlert,
  ListTodo,
  FileText,
  RotateCcw,
  Sparkle
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AISuggestion {
  type: string
  content: string
  confidence: number
}

interface RedFlag {
  symptom: string
  severity: string
  recommendation: string
}

interface ActionItem {
  text: string
  assignee_type: string
  done: boolean
}

interface SOAPNote {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

interface ClinicalNote {
  id: string
  title: string
  note_type: string
  status: string
  tags: string[]
  created_at: string
  updated_at: string
  contact_id: string | null
  raw_transcript?: string | null
  soap_note?: SOAPNote | Record<string, string> | null
  red_flags?: RedFlag[]
  action_items?: ActionItem[]
}

const SAMPLE_SESSIONS = [
  {
    label: 'Headache & Migraine Consult',
    patient: 'Sarah Jenkins',
    type: 'consultation',
    transcript:
      "Doctor: Good morning Sarah, please have a seat. What brings you in today?\nPatient: Thank you doctor. For the past 4 days I've been having these severe throbbing headaches on both sides of my temples. They get worse when looking at computer screens at work.\nDoctor: I see. Have you noticed any sensitivity to light, nausea, or visual changes like flashing lights?\nPatient: No flashing lights, but bright fluorescent lights make my head pound more. No fever or stiff neck.\nDoctor: Let's check your vitals. Blood pressure is 124 over 82, pulse is 74 regular, temperature 36.8 Celsius, oxygen saturation is 99%.\nDoctor: Neurological examination is completely normal. Cranial nerves intact. It looks like an acute tension headache with mild cervical strain from desk posture.\nDoctor: I will recommend Ibuprofen 400mg three times daily after meals for 3 days, plenty of hydration, and taking screen breaks every 45 minutes. If it persists past a week or you develop severe vomiting, please come back immediately.",
  },
  {
    label: 'Emergency Dental Triage',
    patient: 'David Malan',
    type: 'triage',
    transcript:
      "Dentist: Hello David, what seems to be the trouble with your tooth today?\nPatient: Doctor, my lower right molar has been throbbing constantly since yesterday night. It radiates up into my ear and jaw.\nDentist: Are you having any sensitivity to hot or cold drinks, or pain when biting down?\nPatient: Extremely sensitive to cold, and chewing anything on that side is agonizing. I haven't slept all night.\nDentist: Let's examine the quadrant. On percussion, tooth 46 is acutely tender. Deep distal carious lesion visible with pulpal involvement. No extraoral swelling or lymphadenopathy.\nDentist: You have acute irreversible pulpitis on tooth 46. We should initiate root canal therapy today or consider extraction. I'll provide local anesthesia, start pulpectomy, and prescribe Amoxicillin 500mg plus analgesic support.",
  },
  {
    label: 'MedSpa Skin Consultation',
    patient: 'Elena Rostova',
    type: 'treatment_plan',
    transcript:
      "Specialist: Welcome Elena! What specific skin goals are we focusing on today?\nPatient: Hi! I've been dealing with stubborn post-inflammatory hyperpigmentation on my cheeks after acne flare-ups last year, plus some dullness.\nSpecialist: Have you used any active exfoliants like retinol, AHAs, or had chemical peels in the last 2 weeks?\nPatient: I stopped my retinol 5 days ago in preparation. I use sunscreen SPF 50 daily.\nSpecialist: Examination reveals mild Fitzpatrick type III skin with superficial epidermal pigmentation on bilateral malar areas. Skin barrier is intact and well hydrated.\nSpecialist: I recommend a series of 3 gentle Mandelic Acid / Tranexamic Acid peels spaced 4 weeks apart, combined with a daily 10% Azelaic Acid serum at night and continued strict broad-spectrum UV protection.",
  },
]

function SessionPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Tabs: 'active' (conduct session) or 'notes' (browse all session notes)
  const [activeTab, setActiveTab] = useState<'active' | 'notes'>('active')

  // Pre-flight parameters
  const [patientName, setPatientName] = useState('')
  const [sessionType, setSessionType] = useState('consultation')
  const [chiefComplaint, setChiefComplaint] = useState('')

  // Recording & Transcription states
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Session Data states
  const [transcript, setTranscript] = useState('')
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [redFlags, setRedFlags] = useState<RedFlag[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [shortSummary, setShortSummary] = useState('')
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null)

  // Past Notes list states
  const [notesList, setNotesList] = useState<ClinicalNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesSearch, setNotesSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Media references
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Check URL query parameters for pre-filling (e.g. from appointments)
  useEffect(() => {
    const patientParam = searchParams.get('patient')
    const serviceParam = searchParams.get('service')
    const typeParam = searchParams.get('type')
    const tabParam = searchParams.get('tab')

    if (patientParam) setPatientName(patientParam)
    if (serviceParam) setChiefComplaint(serviceParam)
    if (typeParam) setSessionType(typeParam)
    if (tabParam === 'notes') setActiveTab('notes')
  }, [searchParams])

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setRecordingTime(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, '0')
    const secs = (sec % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  // Fetch past session notes
  const fetchNotes = useCallback(async () => {
    setNotesLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filterType) params.set('note_type', filterType)
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/healthcare/notes?${params}`)
      const data = await res.json()
      setNotesList(data.notes ?? [])
    } catch {
      toast.error('Could not load session notes')
    } finally {
      setNotesLoading(false)
    }
  }, [filterType, filterStatus])

  useEffect(() => {
    if (activeTab === 'notes') {
      fetchNotes()
    }
  }, [activeTab, fetchNotes])

  // Start Live Audio & Web Speech Recognition
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorder.start(1000)
      mediaRecorderRef.current = mediaRecorder

      // Browser Web Speech Recognition for instant feedback
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onresult = (event: any) => {
          let currentTranscript = ''
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' '
          }
          if (currentTranscript.trim()) {
            setTranscript((prev) => {
              const base = prev.split('\n[Live Voice Stream]\n')[0]
              const prefix = base ? `${base}\n\n` : ''
              return `${prefix}[Live Voice Stream]\n${currentTranscript.trim()}`
            })
          }
        }

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition warning:', e.error)
        }

        recognition.start()
        recognitionRef.current = recognition
      }

      setIsRecording(true)
      toast.success('Live Session Recording Started. Speak clearly...')
    } catch (err) {
      console.error('Mic error:', err)
      toast.error('Could not access microphone. Please check browser permissions.')
    }
  }

  // Stop Recording & Send for Whisper Transcription
  const stopRecording = useCallback(async () => {
    setIsRecording(false)

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop())
    }

    setIsTranscribing(true)

    // Wait 500ms for final audio chunks
    setTimeout(async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (audioBlob.size > 0) {
          const formData = new FormData()
          formData.append('audio_file', audioBlob, 'session.webm')

          const res = await fetch('/api/healthcare/transcribe', {
            method: 'POST',
            body: formData,
          })

          if (res.ok) {
            const data = await res.json()
            if (data.transcribedText) {
              setTranscript(data.transcribedText)
              if (data.redFlags && data.redFlags.length > 0) {
                setRedFlags(data.redFlags)
              }
              toast.success('Session audio transcribed!')
              runAIAnalysis(data.transcribedText)
            }
          }
        }
      } catch (e) {
        console.warn('Transcription error:', e)
        toast.info('Session audio recorded. Ready for review.')
      } finally {
        setIsTranscribing(false)
      }
    }, 600)
  }, [])

  // Audio File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsTranscribing(true)
    toast.info(`Uploading & processing ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append('audio_file', file, file.name)

      const res = await fetch('/api/healthcare/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setTranscript(data.transcribedText)
        if (data.redFlags) setRedFlags(data.redFlags)
        toast.success('Audio file transcribed!')
        runAIAnalysis(data.transcribedText)
      } else {
        toast.error('Failed to transcribe audio file.')
      }
    } catch {
      toast.error('Error processing audio file.')
    } finally {
      setIsTranscribing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Run AI Analysis & SOAP extraction
  const runAIAnalysis = async (textToAnalyze?: string) => {
    const content = textToAnalyze || transcript
    if (!content || !content.trim()) {
      toast.error('Please record or enter session notes/transcript first.')
      return
    }

    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/healthcare/analyze-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: content }),
      })

      if (res.ok) {
        const data = await res.json()
        const analysis = data.analysis
        setSoapNote(analysis.soapNote)
        setAiSuggestions(analysis.aiSuggestions || [])
        setRedFlags(analysis.redFlags || [])
        setActionItems(analysis.actionItems || [])
        setShortSummary(analysis.shortSummary || '')
        toast.success('AI SOAP Note & Clinical Analysis Generated!')
      } else {
        toast.error('AI Analysis failed.')
      }
    } catch {
      toast.error('Error running AI clinical analysis.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Save to Clinical Notes database
  const saveSessionNote = async () => {
    if (!transcript.trim()) {
      toast.error('No session transcript or notes to save.')
      return
    }

    setIsSaving(true)
    try {
      const title = patientName.trim()
        ? `Consultation — ${patientName.trim()}`
        : `Consultation Note — ${new Date().toLocaleDateString()}`

      const res = await fetch('/api/healthcare/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          note_type: sessionType,
          raw_transcript: transcript,
          soap_note: soapNote,
          ai_suggestions: aiSuggestions,
          action_items: actionItems,
          red_flags: redFlags,
          tags: ['session-recorded', 'ai-analyzed'],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const newNoteId = data.note?.id
        setSavedNoteId(newNoteId)
        toast.success('Session Note successfully saved to records!')
        fetchNotes()
      } else {
        toast.error('Failed to save session note.')
      }
    } catch {
      toast.error('Error saving session note.')
    } finally {
      setIsSaving(false)
    }
  }

  // Add Timestamp Bookmark
  const addBookmark = () => {
    const marker = `\n[Marker @ ${formatSeconds(recordingTime)}] `
    setTranscript((prev) => `${prev}${marker}`)
    toast.info(`Marker added at ${formatSeconds(recordingTime)}`)
  }

  // Load a preset sample visit
  const handleLoadSample = (sample: (typeof SAMPLE_SESSIONS)[0]) => {
    setPatientName(sample.patient)
    setSessionType(sample.type)
    setTranscript(sample.transcript)
    setSavedNoteId(null)
    toast.success(`Loaded "${sample.label}" for ${sample.patient}`)
    runAIAnalysis(sample.transcript)
  }

  // Filtered past notes
  const filteredNotes = notesList.filter((n) => {
    const matchesSearch =
      !notesSearch ||
      n.title.toLowerCase().includes(notesSearch.toLowerCase()) ||
      n.tags?.some((t) => t.toLowerCase().includes(notesSearch.toLowerCase()))
    return matchesSearch
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-foreground">
      {/* Top Banner & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-primary to-rose-600 shadow-md shadow-primary/20 text-white shrink-0">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Sessions
                </h1>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono uppercase tracking-wider">
                  AI Cockpit
                </Badge>
                {isRecording && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Live voice capture, real-time clinical notes, AI SOAP extraction, and session archives.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs - responsive on mobile */}
        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-xl border border-border w-full md:w-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'active'
                ? 'bg-card text-foreground shadow-sm border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mic className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">Active Session</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'notes'
                ? 'bg-card text-foreground shadow-sm border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">Past Notes</span>
            {notesList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-muted text-[10px] text-muted-foreground font-mono">
                {notesList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACTIVE SESSION COCKPIT */}
      {/* ========================================================================= */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {/* Quick Pre-Flight Patient Setup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-card border border-border rounded-2xl p-4 shadow-xs">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Patient / Client Name
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Sarah Jenkins (or walk-in client)"
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-primary" />
                Session Type
              </label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="consultation">🩺 Consultation</option>
                <option value="treatment_plan">📋 Treatment Plan</option>
                <option value="triage">🚨 Emergency Triage</option>
                <option value="follow_up">🔄 Follow-Up</option>
                <option value="referral">🏥 Specialist Referral</option>
                <option value="general">📝 General Session</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Quick Test Sample
              </label>
              <div className="grid grid-cols-3 gap-1">
                {SAMPLE_SESSIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleLoadSample(s)}
                    className="text-[11px] font-medium bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border rounded-xl px-2 py-2 text-foreground transition-all truncate text-center"
                    title={s.label}
                  >
                    {s.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Master Live Recording Cockpit - Dark background matching dashboard */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-lg">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 pb-5 border-b border-border">
              {/* Mic Status & Big Control Button */}
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-5 w-full md:w-auto">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isTranscribing}
                    className="group relative flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-xl shadow-rose-600/30 transition-all transform active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    <Mic className="h-7 w-7 sm:h-8 sm:w-8 transition-transform group-hover:scale-110" />
                    <span className="absolute -bottom-5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      Start Mic
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-card hover:bg-muted text-rose-400 border-2 border-rose-500 shadow-xl shadow-rose-500/25 transition-all transform active:scale-95 animate-pulse shrink-0"
                  >
                    <Square className="h-7 w-7 sm:h-8 sm:w-8 fill-current" />
                    <span className="absolute -bottom-5 text-[9px] font-bold text-rose-400 uppercase tracking-widest">
                      Stop & Save
                    </span>
                  </button>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span
                      className={`h-3 w-3 rounded-full shrink-0 ${
                        isRecording ? 'bg-rose-500 animate-ping' : isTranscribing ? 'bg-amber-500 animate-spin' : 'bg-muted-foreground'
                      }`}
                    />
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      {isRecording
                        ? 'Consultation in Progress'
                        : isTranscribing
                        ? 'Transcribing Speech to Text...'
                        : 'Session Ready'}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-md">
                    {isRecording
                      ? 'Microphone streaming audio. Speak with the patient naturally.'
                      : 'Press Start to initiate live transcription or upload an existing audio file.'}
                  </p>
                </div>
              </div>

              {/* Timer & Secondary Controls */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 w-full md:w-auto">
                <div className="flex flex-col items-center bg-background border border-border rounded-2xl px-4 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Duration
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-foreground tracking-wider">
                    {formatSeconds(recordingTime)}
                  </span>
                </div>

                {isRecording && (
                  <Button
                    onClick={addBookmark}
                    variant="outline"
                    size="sm"
                    className="border-border bg-card text-foreground hover:bg-muted text-xs gap-1.5 rounded-xl h-10"
                  >
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    + Marker
                  </Button>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*"
                  className="hidden"
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRecording || isTranscribing}
                  variant="outline"
                  size="sm"
                  className="border-border bg-card text-foreground hover:bg-muted text-xs gap-1.5 rounded-xl h-10"
                >
                  <UploadCloud className="h-4 w-4 text-primary" />
                  Upload Audio
                </Button>
              </div>
            </div>

            {/* Audio Waveform Simulator Bars */}
            {isRecording && (
              <div className="mt-4 flex items-center justify-center gap-1 sm:gap-1.5 h-10 bg-background/60 rounded-xl p-2 border border-border overflow-hidden">
                {[18, 35, 60, 85, 45, 90, 75, 50, 95, 60, 40, 70, 85, 55, 30, 65, 80, 45].map(
                  (height, i) => (
                    <div
                      key={i}
                      style={{ height: `${height}%` }}
                      className="w-1 sm:w-1.5 bg-gradient-to-t from-rose-500 to-primary rounded-full animate-pulse transition-all"
                    />
                  )
                )}
              </div>
            )}
          </div>

          {/* Two-Column Grid: Left (Transcript & Live Notes) - Right (AI SOAP & Clinical Insights) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Live Transcript & Notes (5 cols on desktop, full width on mobile) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Live Consultation Transcript</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(transcript)
                        toast.success('Transcript copied!')
                      }}
                      disabled={!transcript}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-muted"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                    {transcript && (
                      <button
                        onClick={() => setTranscript('')}
                        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-muted"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="The live transcript or typed session observations will stream here in real-time..."
                  rows={10}
                  className="w-full bg-background border border-input rounded-xl p-3 text-xs sm:text-sm text-foreground leading-relaxed focus:outline-none focus:border-primary resize-none font-mono"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {transcript.split(/\s+/).filter(Boolean).length} words captured
                  </span>

                  <Button
                    onClick={() => runAIAnalysis()}
                    disabled={!transcript.trim() || isAnalyzing}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 rounded-xl shadow-md shadow-primary/20"
                  >
                    {isAnalyzing ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    )}
                    Generate AI SOAP Note
                  </Button>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  onClick={saveSessionNote}
                  disabled={!transcript.trim() || isSaving}
                  className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-2 py-5 rounded-2xl shadow-lg shadow-emerald-900/30"
                >
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Session to Records
                </Button>

                {savedNoteId && (
                  <Link href={`/health-notes/${savedNoteId}`} className="w-full sm:flex-1">
                    <Button
                      variant="outline"
                      className="w-full border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold gap-2 py-5 rounded-2xl"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Full Note
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Right Column: AI SOAP Note & Clinical Intelligence (7 cols on desktop, full width on mobile) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Emergency Red Flags Alert */}
              {redFlags.length > 0 && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                    Critical Red Flags & Safety Warnings ({redFlags.length})
                  </div>
                  <div className="space-y-2">
                    {redFlags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="bg-card border border-rose-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-bold text-rose-300">{flag.symptom}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{flag.recommendation}</div>
                        </div>
                        <Badge
                          className={`text-[10px] font-bold uppercase self-start sm:self-auto shrink-0 ${
                            flag.severity === 'high'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-600 text-white'
                          }`}
                        >
                          {flag.severity} RISK
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SOAP Note Structured Grid */}
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkle className="h-4 w-4 text-amber-400 shrink-0" />
                    <h3 className="text-sm font-bold text-foreground">
                      Structured Clinical SOAP Note
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {soapNote ? 'Generated by AI' : 'Awaiting transcription analysis'}
                  </span>
                </div>

                {soapNote ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Subjective */}
                    <div className="bg-background border border-border rounded-xl p-3.5 space-y-1.5">
                      <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        (S) Subjective
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {soapNote.subjective || 'No subjective complaints noted.'}
                      </p>
                    </div>

                    {/* Objective */}
                    <div className="bg-background border border-border rounded-xl p-3.5 space-y-1.5">
                      <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        (O) Objective
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {soapNote.objective || 'No objective findings recorded.'}
                      </p>
                    </div>

                    {/* Assessment */}
                    <div className="bg-background border border-border rounded-xl p-3.5 space-y-1.5">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        (A) Assessment
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {soapNote.assessment || 'No preliminary diagnosis.'}
                      </p>
                    </div>

                    {/* Plan */}
                    <div className="bg-background border border-border rounded-xl p-3.5 space-y-1.5">
                      <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        (P) Plan & Treatment
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {soapNote.plan || 'No treatment plan established.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-background/50 rounded-xl border border-dashed border-border p-4">
                    <Stethoscope className="h-8 w-8 text-muted-foreground/60" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">
                        No SOAP notes compiled yet.
                      </p>
                      <p className="text-[11px] text-muted-foreground max-w-sm">
                        Start recording the session or click "Load Sample Visit" to generate automated SOAP breakdowns.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Items & Prescriptions */}
              {actionItems.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-foreground">
                      Action Items & Prescriptions ({actionItems.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {actionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-background border border-border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-foreground">{item.text}</span>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground border-border self-start sm:self-auto">
                          {item.assignee_type || 'Patient'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SESSION NOTES & HISTORY HUB */}
      {/* ========================================================================= */}
      {activeTab === 'notes' && (
        <div className="space-y-5">
          {/* Filter & Search Bar - fully responsive on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-4 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={notesSearch}
                onChange={(e) => setNotesSearch(e.target.value)}
                placeholder="Search patient, diagnosis, tags..."
                className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex-1 sm:flex-none bg-background border border-input rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="consultation">Consultation</option>
                <option value="treatment_plan">Treatment Plan</option>
                <option value="triage">Triage</option>
                <option value="referral">Referral</option>
                <option value="follow_up">Follow-Up</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 sm:flex-none bg-background border border-input rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="complete">Complete</option>
                <option value="in_progress">In Progress</option>
                <option value="draft">Draft</option>
              </select>

              <Button
                onClick={() => setActiveTab('active')}
                size="sm"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 rounded-xl h-9 mt-1 sm:mt-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Start Session
              </Button>
            </div>
          </div>

          {/* Notes Cards List */}
          {notesLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading consultation records...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 bg-card/40 rounded-2xl border border-dashed border-border p-6">
              <ClipboardList className="h-10 w-10 text-muted-foreground/60" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No session notes found</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Switch to the Active Session Cockpit above to start a live consultation or save a new note.
                </p>
              </div>
              <Button
                onClick={() => setActiveTab('active')}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs mt-2"
              >
                Start Session
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => {
                const soap = note.soap_note as SOAPNote | undefined
                return (
                  <div
                    key={note.id}
                    className="group bg-card hover:bg-card/90 border border-border hover:border-primary/50 rounded-2xl p-4 sm:p-5 space-y-3 transition-all flex flex-col justify-between shadow-xs hover:shadow-md"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize text-primary border-primary/30 bg-primary/10"
                        >
                          {note.note_type.replace('_', ' ')}
                        </Badge>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            note.status === 'complete'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : note.status === 'in_progress'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {note.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">
                        {note.title}
                      </h4>

                      {/* Brief SOAP / summary preview */}
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {soap?.assessment ||
                          soap?.subjective ||
                          note.raw_transcript?.slice(0, 140) ||
                          'No clinical notes summary available.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="h-3 w-3" />
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>

                      <Link href={`/health-notes/${note.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary hover:text-primary hover:bg-primary/10 h-8 px-2.5 gap-1"
                        >
                          Open Note
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-foreground">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading Session Cockpit...</p>
          </div>
        </div>
      }
    >
      <SessionPageContent />
    </Suspense>
  )
}
