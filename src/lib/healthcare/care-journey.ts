/**
 * Care Journey — Healthcare AI Library
 *
 * Generates and manages automated post-consultation WhatsApp
 * message sequences triggered after a consultation is marked complete.
 */

export interface CareJourneyMessage {
  dayOffset: number      // Days after consultation to send (0 = same day)
  messageText: string
  status: 'pending' | 'sent' | 'failed'
  sentAt?: string
}

export interface CareJourneySequence {
  messages: CareJourneyMessage[]
  totalDays: number
}

/**
 * Generate a care journey sequence from a consultation summary.
 * Uses AI-generated shortSummary from the SOAP analysis and
 * vertical-specific templates.
 */
export function buildCareJourneySequence(params: {
  vertical: 'dentist' | 'medspa' | 'general'
  patientName: string
  clinicName: string
  consultationSummary: string
  serviceType?: string
  hasMedications: boolean
  hasFollowUpRequired: boolean
  clinicPhone: string
}): CareJourneySequence {
  const {
    vertical,
    patientName,
    clinicName,
    consultationSummary,
    serviceType = 'consultation',
    hasMedications,
    hasFollowUpRequired,
    clinicPhone,
  } = params

  const firstName = patientName.split(' ')[0]
  const messages: CareJourneyMessage[] = []

  // Day 0 — Immediate consultation summary
  messages.push({
    dayOffset: 0,
    messageText:
      `Hi ${firstName}! 👋 Thank you for visiting *${clinicName}* today.\n\n` +
      `📋 *Your consultation summary:*\n${consultationSummary}\n\n` +
      `If you have any questions or concerns after your visit, please don't hesitate to reply here. We're here to help! 💙`,
    status: 'pending',
  })

  // Day 1 — Medication reminder (if applicable)
  if (hasMedications) {
    messages.push({
      dayOffset: 1,
      messageText:
        `Good morning ${firstName}! ☀️\n\n` +
        `*Medication Reminder from ${clinicName}:*\n` +
        `Please remember to take your prescribed medication as directed.\n\n` +
        `⚠️ If you experience any side effects or unusual symptoms, contact us immediately at ${clinicPhone} or reply here.`,
      status: 'pending',
    })
  }

  // Day 3 — Check-in
  const verticalCheckIn: Record<string, string> = {
    dentist: `How is your mouth feeling, ${firstName}? 😊\n\nAre you experiencing any:\n• Pain or discomfort?\n• Sensitivity?\n• Swelling?\n\nReply with a number:\n1️⃣ Feeling great!\n2️⃣ Some mild discomfort\n3️⃣ I need help — please call me`,
    medspa: `Hi ${firstName}! How is your skin feeling after your treatment? ✨\n\nAre you experiencing any:\n• Redness or irritation?\n• Swelling or bruising?\n• Unexpected reactions?\n\nReply with a number:\n1️⃣ Looking and feeling great!\n2️⃣ Some mild reaction (normal)\n3️⃣ I'm concerned — please call me`,
    general: `Hi ${firstName}, just checking in! 💙\n\nHow are you feeling since your visit to *${clinicName}*?\n\nReply with a number:\n1️⃣ Feeling much better\n2️⃣ About the same\n3️⃣ I need assistance — please call me`,
  }

  messages.push({
    dayOffset: 3,
    messageText: `${clinicName} 3-Day Check-In 📋\n\n${verticalCheckIn[vertical] ?? verticalCheckIn.general}`,
    status: 'pending',
  })

  // Day 7 — Follow-up prompt (if required)
  if (hasFollowUpRequired) {
    messages.push({
      dayOffset: 7,
      messageText:
        `Hi ${firstName}! 👋 It's been a week since your visit to *${clinicName}*.\n\n` +
        `📅 *Time for your follow-up appointment?*\n` +
        `Your treatment plan recommends a follow-up soon.\n\n` +
        `Reply *BOOK* to schedule your follow-up, or call us at ${clinicPhone}.`,
      status: 'pending',
    })
  }

  // Day 30 — Recall / wellness check
  const verticalRecall: Record<string, string> = {
    dentist: `Hi ${firstName}! 🦷 Your oral health matters to us!\n\nIt's been a month since your visit. Don't forget:\n• Brush twice daily\n• Floss daily\n• Your next check-up should be in ${hasFollowUpRequired ? '2 months' : '6 months'}\n\nReply *BOOK* to schedule or call ${clinicPhone}.`,
    medspa: `Hi ${firstName}! ✨ It's been 30 days since your treatment at *${clinicName}*.\n\nYour skin needs ongoing care! We recommend:\n• SPF daily protection\n• Moisturising routine\n• Consider a maintenance treatment\n\nReply *BOOK* to see our current specials or call ${clinicPhone}.`,
    general: `Hi ${firstName}! 💙 Just a friendly 30-day check-in from *${clinicName}*.\n\nWe hope you're feeling well! Remember, proactive health care is the best health care.\n\nReply *BOOK* to schedule your next visit or call us at ${clinicPhone}.`,
  }

  messages.push({
    dayOffset: 30,
    messageText: verticalRecall[vertical] ?? verticalRecall.general,
    status: 'pending',
  })

  return {
    messages,
    totalDays: 30,
  }
}

/**
 * Calculate the absolute send timestamp for a care journey message.
 */
export function calculateSendAt(consultationDate: Date, dayOffset: number): Date {
  const sendAt = new Date(consultationDate)
  sendAt.setDate(sendAt.getDate() + dayOffset)
  // Always send at 9:00 AM local time for Day 1+ messages
  if (dayOffset > 0) {
    sendAt.setHours(9, 0, 0, 0)
  }
  return sendAt
}

/**
 * Find the next pending message index in a sequence.
 */
export function findNextPendingIndex(messages: CareJourneyMessage[]): number {
  return messages.findIndex((m) => m.status === 'pending')
}
