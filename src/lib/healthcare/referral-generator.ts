/**
 * Referral Letter Generator — Healthcare AI Library
 *
 * Generates professional, medically-formatted referral letters
 * using AI, based on clinical notes and patient data.
 */

export interface ReferralLetterData {
  // Patient info
  patientName: string
  patientDob?: string
  patientPhone: string

  // Referring clinician
  referringClinicianName: string
  referringClinicName: string
  referringClinicPhone: string
  referringClinicAddress?: string

  // Referral target
  specialistName?: string
  specialistSpecialty: string
  specialistClinic?: string

  // Clinical content
  reasonForReferral: string
  relevantHistory: string
  currentMedications: string
  allergies: string
  urgency: 'routine' | 'urgent' | 'emergency'

  // Generated
  letterText?: string
  generatedAt?: string
}

/**
 * Build the AI prompt for generating a referral letter.
 */
export function buildReferralLetterPrompt(data: Omit<ReferralLetterData, 'letterText' | 'generatedAt'>): string {
  const urgencyText = {
    routine: 'Routine — within 4–6 weeks',
    urgent: 'Urgent — within 1 week',
    emergency: 'EMERGENCY — same day / immediate',
  }[data.urgency]

  return `You are a medical writing AI assistant. Generate a professional clinical referral letter.

Patient Details:
- Name: ${data.patientName}
- Date of Birth: ${data.patientDob ?? 'Not on record'}
- Contact: ${data.patientPhone}

Referring Clinician:
- Clinician: ${data.referringClinicianName}
- Practice: ${data.referringClinicName}
- Phone: ${data.referringClinicPhone}
- Address: ${data.referringClinicAddress ?? 'Not provided'}

Referred To:
- Specialist Type: ${data.specialistSpecialty}
- Specialist Name: ${data.specialistName ?? 'To be assigned'}
- Clinic: ${data.specialistClinic ?? 'To be assigned'}

Clinical Information:
- Reason for Referral: ${data.reasonForReferral}
- Relevant History: ${data.relevantHistory}
- Current Medications: ${data.currentMedications}
- Known Allergies: ${data.allergies}
- Urgency: ${urgencyText}

Write a formal referral letter in standard medical letter format. Include:
1. Date and letterhead
2. Greeting (Dear Dr/Specialist)
3. Patient introduction and reason for referral
4. Relevant clinical history and current presentation
5. Current medications and allergies
6. Specific request/question for the specialist
7. Professional closing
8. Signature block

Use professional, clear medical language. Do not include placeholder text — if information is missing, note it appropriately.
Return ONLY the letter text — no JSON, no markdown headers.`
}

/**
 * Detect which specialty is likely needed from a consultation analysis.
 */
export function suggestSpecialtyFromFlags(
  conditions: string[],
  redFlagSymptoms: string[],
): string[] {
  const specialtyMap: Array<{ keywords: string[]; specialty: string }> = [
    { keywords: ['chest pain', 'cardiac', 'heart', 'palpitations', 'arrhythmia'], specialty: 'Cardiologist' },
    { keywords: ['skin', 'rash', 'dermatitis', 'acne', 'melanoma', 'psoriasis'], specialty: 'Dermatologist' },
    { keywords: ['bone', 'joint', 'fracture', 'arthritis', 'orthopedic'], specialty: 'Orthopedic Surgeon' },
    { keywords: ['eye', 'vision', 'retina', 'glaucoma', 'cataract'], specialty: 'Ophthalmologist' },
    { keywords: ['mental', 'anxiety', 'depression', 'psychiatric', 'psychological'], specialty: 'Psychiatrist' },
    { keywords: ['kidney', 'renal', 'urinary', 'bladder'], specialty: 'Nephrologist / Urologist' },
    { keywords: ['stomach', 'bowel', 'colon', 'gastric', 'digestive'], specialty: 'Gastroenterologist' },
    { keywords: ['diabetes', 'thyroid', 'hormone', 'endocrine'], specialty: 'Endocrinologist' },
    { keywords: ['lung', 'breathing', 'respiratory', 'asthma', 'copd'], specialty: 'Pulmonologist' },
    { keywords: ['nerve', 'neurological', 'seizure', 'migraine', 'headache'], specialty: 'Neurologist' },
    { keywords: ['teeth', 'oral', 'gum', 'jaw', 'orthodontic', 'root canal'], specialty: 'Dental Specialist' },
    { keywords: ['skin aesthetics', 'laser', 'filler', 'botox', 'medspa'], specialty: 'Aesthetic Physician' },
    { keywords: ['cancer', 'tumor', 'malignant', 'oncology'], specialty: 'Oncologist' },
    { keywords: ['child', 'infant', 'pediatric', 'developmental'], specialty: 'Paediatrician' },
  ]

  const allText = [...conditions, ...redFlagSymptoms].join(' ').toLowerCase()
  const matched = new Set<string>()

  for (const { keywords, specialty } of specialtyMap) {
    if (keywords.some((k) => allText.includes(k))) {
      matched.add(specialty)
    }
  }

  return Array.from(matched)
}
