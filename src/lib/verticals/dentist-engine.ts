export interface DentalTriageResult {
  isEmergency: boolean;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedService: string;
  summary: string;
  recommendedAction: string;
}

export const DENTIST_SYSTEM_PROMPT = `
You are DentalCare AI, an expert, empathetic, and professional AI receptionist for a dental clinic on WhatsApp.

Your Core Mandate:
1. Greet patients warmly and understand their primary concern (Cleaning, Toothache, Whitening, Braces, Emergency, Cavity).
2. EMERGENCY TRIAGE: If the patient mentions severe pain, bleeding, swelling, trauma/broken tooth, or difficulty swallowing, classify this as a DENTAL EMERGENCY. Urge them to seek immediate care and gather their full name and location.
3. APPOINTMENT BOOKING: Help patients select a preferred date and time for consultations.
4. RECALL CARE: Remind patients of 6-month checkups and provide post-procedure care tips (e.g. after extraction or root canal).

Guidelines:
- Keep WhatsApp messages concise, clear, and reassuring.
- Use line breaks and bullet points for readability.
- Never diagnose medical conditions definitively; provide professional guidance and schedule a dentist consultation.
`;

export function evaluateDentalTriage(message: string): DentalTriageResult {
  const text = message.toLowerCase();
  
  if (text.includes('broken tooth') || text.includes('knocked out') || text.includes('bleeding') || text.includes('swelling') || text.includes('severe pain') || text.includes('unbearable')) {
    return {
      isEmergency: true,
      urgencyLevel: 'CRITICAL',
      suggestedService: 'Emergency Dental Consultation',
      summary: 'Patient reports severe dental pain, trauma, or swelling requiring immediate intervention.',
      recommendedAction: 'Alert on-call dentist immediately and schedule emergency slot.'
    };
  }

  if (text.includes('pain') || text.includes('ache') || text.includes('sensitive') || text.includes('chipped')) {
    return {
      isEmergency: false,
      urgencyLevel: 'MEDIUM',
      suggestedService: 'Urgent Dental Examination',
      summary: 'Patient reports moderate toothache or dental discomfort.',
      recommendedAction: 'Schedule consultation within 24-48 hours.'
    };
  }

  if (text.includes('whiten') || text.includes('clean') || text.includes('braces') || text.includes('aligners') || text.includes('checkup')) {
    return {
      isEmergency: false,
      urgencyLevel: 'LOW',
      suggestedService: text.includes('whiten') ? 'Teeth Whitening Consultation' : text.includes('clean') ? 'Hygiene & Cleaning' : 'Orthodontic Assessment',
      summary: 'Patient requesting elective or routine dental treatment.',
      recommendedAction: 'Offer available routine appointment slots.'
    };
  }

  return {
    isEmergency: false,
    urgencyLevel: 'LOW',
    suggestedService: 'General Dental Consultation',
    summary: 'General inquiry about clinic services or scheduling.',
    recommendedAction: 'Present general clinic booking options.'
  };
}
