import { engineSendText } from '@/lib/flows/meta-send'

export interface WhatsAppInboundPayload {
  accountId: string
  conversationId: string
  contactId: string
  configOwnerUserId: string
  userMessage: string
}

/**
 * Eve WhatsApp Channel Handler
 * Receives inbound messages and dispatches Eve agent responses.
 */
export async function sendWhatsAppReply(
  payload: WhatsAppInboundPayload,
  replyText: string
) {
  const { accountId, conversationId, contactId, configOwnerUserId } = payload

  // Enforce single asterisk bolding for WhatsApp
  const sanitizedText = replyText.replace(/\*\*/g, '*')

  return await engineSendText({
    accountId,
    userId: configOwnerUserId,
    conversationId,
    contactId,
    text: sanitizedText,
    aiGenerated: true,
  })
}
