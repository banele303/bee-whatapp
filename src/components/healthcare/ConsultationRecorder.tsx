'use client'

import React, { useState, useCallback } from 'react'
import { Mic, MicOff, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

interface ConsultationRecorderProps {
  noteId: string
  onTranscriptUpdated: (transcript: string) => void
}

type RecordingState = 'idle' | 'recording' | 'transcribing' | 'done' | 'error'

export function ConsultationRecorder({ noteId, onTranscriptUpdated }: ConsultationRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [chunks, setChunks] = useState<Blob[]>([])

  const startRecording = useCallback(async () => {
    setErrorMsg(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const audioChunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data)
      }

      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop())
        setState('transcribing')

        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('audio_file', audioBlob, 'recording.webm')

          const res = await fetch(`/api/healthcare/notes/${noteId}/transcribe`, {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error ?? 'Transcription failed')
          }

          const data = await res.json()
          onTranscriptUpdated(data.rawTranscript)
          setState('done')
          setTimeout(() => setState('idle'), 3000)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to transcribe'
          setErrorMsg(message)
          setState('error')
        }
      }

      recorder.start()
      setMediaRecorder(recorder)
      setChunks(audioChunks)
      setState('recording')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not access microphone'
      setErrorMsg(message)
      setState('error')
    }
  }, [noteId, onTranscriptUpdated])

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
  }, [mediaRecorder])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* Record / Stop Button */}
        {state === 'idle' || state === 'done' || state === 'error' ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-all shadow-lg shadow-rose-500/20"
          >
            <Mic className="w-4 h-4" />
            Record Voice Note
          </button>
        ) : state === 'recording' ? (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-all animate-pulse"
          >
            <MicOff className="w-4 h-4 text-rose-400" />
            Stop Recording
          </button>
        ) : state === 'transcribing' ? (
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-sm font-semibold cursor-not-allowed"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Transcribing...
          </button>
        ) : null}

        {/* State indicators */}
        {state === 'recording' && (
          <span className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Recording…
          </span>
        )}
        {state === 'transcribing' && (
          <span className="text-xs text-slate-400">
            Sending to Whisper AI…
          </span>
        )}
        {state === 'done' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Transcript added!
          </span>
        )}
      </div>

      {/* Error state */}
      {state === 'error' && errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Transcription failed: </span>
            {errorMsg}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Click <strong>Record Voice Note</strong> to capture a consultation note via your microphone.
        The recording is transcribed automatically using Whisper AI and appended to the transcript below.
      </p>
    </div>
  )
}
