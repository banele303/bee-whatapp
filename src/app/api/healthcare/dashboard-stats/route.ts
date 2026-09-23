import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/healthcare/dashboard-stats
 *
 * Returns aggregated clinic intelligence stats for the
 * Clinic Intelligence Dashboard (Feature 5).
 *
 * Data is scoped strictly to the account (RLS).
 */
export async function GET(_request: Request) {
  try {
    const { supabase, accountId } = await requireRole('viewer')

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // --- Parallel data fetches ---
    const [
      notesResult,
      riskProfilesResult,
      careJourneysResult,
      appointmentsResult,
    ] = await Promise.all([
      // All notes in last 30 days
      supabase
        .from('clinical_notes')
        .select('id, note_type, status, soap_note, red_flags, ai_suggestions, created_at')
        .eq('account_id', accountId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false }),

      // Risk profile distribution
      supabase
        .from('patient_risk_profiles')
        .select('risk_level, chronic_conditions, ai_alerts, total_consultations, contact_id, ai_summary, risk_score')
        .eq('account_id', accountId)
        .order('risk_score', { ascending: false }),

      // Care journeys status
      supabase
        .from('care_journey_messages')
        .select('id, status, created_at')
        .eq('account_id', accountId)
        .gte('created_at', thirtyDaysAgo),

      // Upcoming appointments
      supabase
        .from('appointments')
        .select('id, service_name, appointment_date, status')
        .eq('account_id', accountId)
        .gte('appointment_date', now.toISOString())
        .order('appointment_date', { ascending: true })
        .limit(30),
    ])

    const notes = notesResult.data ?? []
    const riskProfiles = riskProfilesResult.data ?? []
    const careJourneys = careJourneysResult.data ?? []
    const appointments = appointmentsResult.data ?? []

    // --- Risk distribution ---
    const riskDistribution = {
      low: riskProfiles.filter((r) => r.risk_level === 'low').length,
      medium: riskProfiles.filter((r) => r.risk_level === 'medium').length,
      high: riskProfiles.filter((r) => r.risk_level === 'high').length,
      critical: riskProfiles.filter((r) => r.risk_level === 'critical').length,
    }

    // --- High-risk patients list (top 10) ---
    const highRiskPatients = riskProfiles
      .filter((r) => r.risk_level === 'high' || r.risk_level === 'critical')
      .slice(0, 10)
      .map((r) => ({
        contactId: r.contact_id,
        riskLevel: r.risk_level,
        riskScore: r.risk_score,
        conditions: r.chronic_conditions ?? [],
        summary: r.ai_summary,
      }))

    // --- Condition frequency analysis ---
    const conditionCounts: Record<string, number> = {}
    for (const profile of riskProfiles) {
      for (const condition of (profile.chronic_conditions as string[]) ?? []) {
        conditionCounts[condition] = (conditionCounts[condition] ?? 0) + 1
      }
    }
    const topConditions = Object.entries(conditionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // --- Note volume by day (last 30 days) ---
    const notesByDay: Record<string, number> = {}
    for (const note of notes) {
      const day = note.created_at.slice(0, 10)
      notesByDay[day] = (notesByDay[day] ?? 0) + 1
    }
    const notesOverTime = Object.entries(notesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // --- Note type breakdown ---
    const noteTypeBreakdown: Record<string, number> = {}
    for (const note of notes) {
      noteTypeBreakdown[note.note_type] = (noteTypeBreakdown[note.note_type] ?? 0) + 1
    }

    // --- Red flag alerts from last 7 days ---
    const recentAlerts: Array<{
      symptom: string
      severity: string
      noteId: string
      date: string
    }> = []

    for (const note of notes.filter((n) => n.created_at >= sevenDaysAgo)) {
      const flags = (note.red_flags as Array<{ symptom: string; severity: string }>) ?? []
      for (const flag of flags) {
        if (flag.severity === 'high' || flag.severity === 'critical') {
          recentAlerts.push({
            symptom: flag.symptom,
            severity: flag.severity,
            noteId: note.id,
            date: note.created_at,
          })
        }
      }
    }

    // --- Care journey stats ---
    const journeyStats = {
      active: careJourneys.filter((j) => j.status === 'active').length,
      completed: careJourneys.filter((j) => j.status === 'completed').length,
      total: careJourneys.length,
    }

    // --- Upcoming appointment load ---
    const appointmentsByDay: Record<string, number> = {}
    for (const appt of appointments) {
      const day = appt.appointment_date.slice(0, 10)
      appointmentsByDay[day] = (appointmentsByDay[day] ?? 0) + 1
    }
    const upcomingLoad = Object.entries(appointmentsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 14)
      .map(([date, count]) => ({ date, count }))

    return NextResponse.json({
      riskDistribution,
      highRiskPatients,
      topConditions,
      notesOverTime,
      noteTypeBreakdown,
      recentAlerts,
      journeyStats,
      upcomingLoad,
      totalNotes: notes.length,
      totalPatients: riskProfiles.length,
      totalUpcomingAppointments: appointments.length,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
