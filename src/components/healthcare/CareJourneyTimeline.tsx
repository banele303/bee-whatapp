'use client'

import React from 'react'
import { CheckCircle2, Clock, AlertCircle, MessageSquare } from 'lucide-react'

interface CareJourneyMsg {
  dayOffset: number
  messageText: string
  status: 'pending' | 'sent' | 'failed'
  sentAt?: string
  scheduledAt?: string
}

interface CareJourney {
  id: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  message_sequence: CareJourneyMsg[]
  created_at: string
  next_send_at: string | null
}

interface CareJourneyTimelineProps {
  journeys: CareJourney[]
  isLoading?: boolean
}

const STATUS_COLORS = {
  sent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  pending: 'text-slate-400 bg-slate-800/50 border-slate-700/50',
  failed: 'text-red-400 bg-red-500/10 border-red-500/30',
}

const STATUS_ICONS = {
  sent: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  pending: <Clock className="w-4 h-4 text-slate-500" />,
  failed: <AlertCircle className="w-4 h-4 text-red-400" />,
}

export function CareJourneyTimeline({ journeys, isLoading }: CareJourneyTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-800/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (journeys.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No care journeys started yet. Complete a consultation to trigger the first one.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {journeys.map((journey) => (
        <div key={journey.id} className="space-y-3">
          {/* Journey Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">
                Care Journey — {new Date(journey.created_at).toLocaleDateString('en-ZA')}
              </span>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                journey.status === 'active'
                  ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                  : journey.status === 'completed'
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : journey.status === 'paused'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-slate-400 bg-slate-700/50 border-slate-600/50'
              }`}
            >
              {journey.status}
            </span>
          </div>

          {/* Message Timeline */}
          <div className="relative pl-5">
            {/* Vertical line */}
            <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-700" />

            <div className="space-y-3">
              {journey.message_sequence.map((msg, i) => (
                <div key={i} className="relative flex gap-4">
                  {/* Dot */}
                  <div
                    className={`absolute -left-3.5 w-3 h-3 rounded-full border-2 mt-1.5 ${
                      msg.status === 'sent'
                        ? 'bg-emerald-500 border-emerald-500'
                        : msg.status === 'failed'
                        ? 'bg-red-500 border-red-500'
                        : 'bg-slate-700 border-slate-600'
                    }`}
                  />

                  {/* Message Card */}
                  <div className={`flex-1 p-3 rounded-xl border text-xs space-y-1.5 ${STATUS_COLORS[msg.status]}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {STATUS_ICONS[msg.status]}
                        <span>Day {msg.dayOffset}</span>
                      </div>
                      <span className="text-slate-500">
                        {msg.status === 'sent' && msg.sentAt
                          ? `Sent ${new Date(msg.sentAt).toLocaleDateString('en-ZA')}`
                          : msg.scheduledAt && msg.status === 'pending'
                          ? `Scheduled ${new Date(msg.scheduledAt).toLocaleDateString('en-ZA')}`
                          : msg.status}
                      </span>
                    </div>
                    <p className="text-slate-400 leading-relaxed line-clamp-2">
                      {msg.messageText}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
