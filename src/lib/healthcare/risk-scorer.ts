/**
 * Patient Risk Scorer — Healthcare AI Library
 *
 * Builds a holistic risk profile for a patient by feeding their
 * complete clinical notes history to an AI model.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface PatientRiskProfile {
  riskLevel: RiskLevel
  riskScore: number               // 0–100 composite score
  chronicConditions: string[]
  medicationHistory: Array<{
    name: string
    dosage?: string
    dateMentioned: string
  }>
  allergyFlags: string[]
  visitFrequencyScore: number    // 0–100; high = patient visits appropriately for their risk
  totalConsultations: number
  aiAlerts: Array<{
    message: string
    severity: RiskLevel
    triggeredAt: string
  }>
  aiSummary: string              // Narrative paragraph for clinician quick-read
}

/**
 * Score calculation rules applied deterministically (before/without AI).
 * The LLM provides the narrative; numbers come from these rules.
 */
export function calculateRiskScore(
  conditions: string[],
  alerts: Array<{ severity: RiskLevel }>,
  totalConsultations: number,
  daysSinceLastConsultation: number,
  hasUrgentRedFlags: boolean,
): { score: number; level: RiskLevel } {
  let score = 0

  // Base from chronic conditions (10 pts each, max 40)
  score += Math.min(conditions.length * 10, 40)

  // Alerts contribution
  for (const alert of alerts) {
    if (alert.severity === 'critical') score += 25
    else if (alert.severity === 'high') score += 15
    else if (alert.severity === 'medium') score += 8
    else score += 3
  }
  score = Math.min(score, 60) // Cap alert contribution

  // Urgent red flags found in latest note
  if (hasUrgentRedFlags) score += 30

  // Infrequent visits for high-condition patients
  if (conditions.length >= 2 && daysSinceLastConsultation > 180) {
    score += 10
  }

  // Activity bonus (reduces risk perception if patient is engaged)
  if (totalConsultations > 5 && daysSinceLastConsultation < 90) {
    score = Math.max(score - 10, 0)
  }

  score = Math.min(Math.round(score), 100)

  const level: RiskLevel =
    score >= 75 ? 'critical' :
    score >= 50 ? 'high' :
    score >= 25 ? 'medium' : 'low'

  return { score, level }
}

/**
 * Builds the AI system prompt for holistic patient history analysis.
 */
export function buildRiskProfilePrompt(): string {
  return `You are a clinical AI risk analyst. You will be given a set of consultation notes from a patient's medical history.

Analyze all notes and extract the following into a JSON object:
{
  "chronicConditions": ["array of identified chronic conditions or recurring complaints"],
  "medicationHistory": [{"name": "...", "dosage": "...", "dateMentioned": "ISO date"}],
  "allergyFlags": ["array of mentioned allergies or adverse reactions"],
  "aiAlerts": [
    {
      "message": "Alert description — pattern or concern identified",
      "severity": "low|medium|high|critical",
      "triggeredAt": "ISO timestamp"
    }
  ],
  "aiSummary": "A concise 3-5 sentence clinical narrative summarizing this patient's overall health profile, patterns, and key concerns for the treating clinician."
}

Look for:
- Conditions mentioned repeatedly across multiple notes (chronic)
- Escalating symptoms over time
- Medication interactions or contraindications
- Gaps in follow-up that may indicate non-compliance
- Any red-flag patterns (e.g. chest pain mentioned in 3 separate visits)

Return ONLY the JSON object. No markdown. No explanations.`
}

/**
 * Calculate visit frequency score.
 * Higher score = patient is visiting as frequently as their risk warrants.
 */
export function calculateVisitFrequencyScore(
  riskScore: number,
  totalConsultations: number,
  daysSinceFirstConsultation: number,
): number {
  if (daysSinceFirstConsultation === 0 || totalConsultations === 0) return 50

  const visitsPerYear = (totalConsultations / daysSinceFirstConsultation) * 365
  const expectedVisitsPerYear =
    riskScore >= 75 ? 12 :  // Critical: monthly
    riskScore >= 50 ? 6 :   // High: bi-monthly
    riskScore >= 25 ? 3 :   // Medium: quarterly
    1                        // Low: annually

  const ratio = Math.min(visitsPerYear / expectedVisitsPerYear, 2)
  return Math.round(ratio * 50) // 0–100 scale
}

/**
 * Maps risk level to a display color class (Tailwind).
 */
export function riskLevelColor(level: RiskLevel): string {
  return {
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  }[level]
}

/**
 * Maps risk level to an emoji indicator.
 */
export function riskLevelEmoji(level: RiskLevel): string {
  return { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' }[level]
}
