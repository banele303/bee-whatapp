/**
 * SOAP Note Parser — Healthcare AI Library
 *
 * Builds a structured SOAP (Subjective, Objective, Assessment, Plan) note
 * from a raw consultation transcript using an AI model.
 * Also extracts red flags, action items, medication suggestions and
 * follow-up recommendations.
 */

export interface SOAPNote {
  subjective: string   // Patient-reported symptoms, complaints, history
  objective: string    // Clinical findings, vitals, observations
  assessment: string   // Diagnosis / differential diagnoses
  plan: string         // Treatment plan, prescriptions, referrals, next steps
}

export interface AISuggestion {
  type: 'medication' | 'referral' | 'follow_up' | 'alert' | 'test'
  content: string
  confidence: number   // 0–1
}

export interface RedFlag {
  symptom: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
}

export interface ActionItem {
  text: string
  assignee_type: 'clinician' | 'patient' | 'admin'
  due_date?: string  // ISO date
  done: boolean
}

export interface ConsultationAnalysis {
  soapNote: SOAPNote
  aiSuggestions: AISuggestion[]
  redFlags: RedFlag[]
  actionItems: ActionItem[]
  shortSummary: string  // 1-2 sentence summary for care journey Day 0 message
}

/**
 * Build the system prompt for SOAP extraction.
 * Tailored per vertical (dentist vs medspa) for relevant suggestions.
 */
export function buildSOAPSystemPrompt(vertical: 'dentist' | 'medspa' | 'general'): string {
  const verticalContext: Record<string, string> = {
    dentist: `You are an expert dental clinical AI assistant. You specialize in oral health, dental procedures, orthodontics, periodontics, and endodontics. When identifying conditions look for: cavities, gum disease, root canal indications, dental trauma, occlusion issues, bruxism.`,
    medspa: `You are an expert aesthetic medicine clinical AI assistant. You specialize in skin treatments, laser therapy, injectables (Botox, fillers), HydraFacial, microneedling, chemical peels, and body contouring. When identifying conditions look for: skin concerns, contraindications for treatments, post-procedure complications.`,
    general: `You are an expert clinical AI assistant helping healthcare professionals document patient consultations.`,
  }

  return `${verticalContext[vertical] || verticalContext.general}

Your task is to analyze a raw consultation transcript and produce a structured clinical note.

Return ONLY a valid JSON object with this exact schema:
{
  "soapNote": {
    "subjective": "Patient's reported symptoms, chief complaint, medical history mentioned",
    "objective": "Any mentioned clinical findings, vitals, physical observations",
    "assessment": "Assessment, diagnosis, or differential diagnoses discussed",
    "plan": "Treatment plan, prescriptions, referrals, follow-ups agreed on"
  },
  "aiSuggestions": [
    {
      "type": "medication|referral|follow_up|alert|test",
      "content": "Specific suggestion text",
      "confidence": 0.0
    }
  ],
  "redFlags": [
    {
      "symptom": "Symptom or sign that warrants urgent attention",
      "severity": "low|medium|high|critical",
      "recommendation": "Recommended action"
    }
  ],
  "actionItems": [
    {
      "text": "Specific action to take",
      "assignee_type": "clinician|patient|admin",
      "due_date": "ISO date or null",
      "done": false
    }
  ],
  "shortSummary": "1-2 sentence plain-language summary of this consultation for patient follow-up messages"
}

Rules:
- If information for a SOAP section is not present in the transcript, use "Not documented in this session."
- Only flag red flags when genuinely warranted — do not over-alert.
- Keep suggestions evidence-based and medically appropriate.
- Never diagnose definitively — use language like "suggestive of" or "may indicate".
- Return ONLY the JSON object — no markdown, no explanation.`
}

/**
 * Parse the AI response into a ConsultationAnalysis object.
 * Handles malformed JSON gracefully.
 */
export function parseSOAPResponse(raw: string): ConsultationAnalysis {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      soapNote: {
        subjective: parsed.soapNote?.subjective ?? 'Not documented.',
        objective: parsed.soapNote?.objective ?? 'Not documented.',
        assessment: parsed.soapNote?.assessment ?? 'Not documented.',
        plan: parsed.soapNote?.plan ?? 'Not documented.',
      },
      aiSuggestions: Array.isArray(parsed.aiSuggestions) ? parsed.aiSuggestions : [],
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      shortSummary: parsed.shortSummary ?? 'Consultation completed.',
    }
  } catch {
    return {
      soapNote: {
        subjective: 'Could not extract — please review transcript manually.',
        objective: 'Not documented.',
        assessment: 'Not documented.',
        plan: 'Not documented.',
      },
      aiSuggestions: [],
      redFlags: [],
      actionItems: [],
      shortSummary: 'Consultation completed.',
    }
  }
}

/**
 * Quick keyword-based red-flag scanner as a safety net BEFORE
 * sending to the LLM — catches critical terms that must always
 * trigger an alert regardless of AI output.
 */
export function quickScanRedFlags(transcript: string): RedFlag[] {
  const text = transcript.toLowerCase()
  const flags: RedFlag[] = []

  const criticalKeywords: Array<{ terms: string[]; symptom: string; recommendation: string }> = [
    {
      terms: ['chest pain', 'chest tightness', 'heart attack', 'cardiac'],
      symptom: 'Chest pain or cardiac symptoms mentioned',
      recommendation: 'Urgent cardiac evaluation — consider referral to cardiologist or emergency services.',
    },
    {
      terms: ['difficulty breathing', 'shortness of breath', 'can\'t breathe'],
      symptom: 'Respiratory distress symptoms',
      recommendation: 'Assess airway and breathing immediately. Consider emergency referral.',
    },
    {
      terms: ['severe bleeding', 'heavy bleeding', 'won\'t stop bleeding'],
      symptom: 'Significant hemorrhage reported',
      recommendation: 'Immediate hemostasis required. Emergency assessment needed.',
    },
    {
      terms: ['anaphylaxis', 'allergic reaction', 'throat closing', 'face swelling'],
      symptom: 'Possible anaphylactic reaction',
      recommendation: 'Administer epinephrine if available. Call emergency services immediately.',
    },
    {
      terms: ['suicide', 'suicidal', 'want to die', 'end my life'],
      symptom: 'Suicidal ideation expressed',
      recommendation: 'Immediate mental health crisis intervention required. Do not leave patient alone.',
    },
    {
      terms: ['sepsis', 'high fever', 'confusion', 'altered consciousness'],
      symptom: 'Possible sepsis or altered mental status',
      recommendation: 'Urgent medical assessment. Consider emergency referral.',
    },
  ]

  for (const { terms, symptom, recommendation } of criticalKeywords) {
    if (terms.some((t) => text.includes(t))) {
      flags.push({ symptom, severity: 'critical', recommendation })
    }
  }

  return flags
}
