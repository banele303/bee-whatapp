import { sanitizePhoneForMeta } from './phone-utils'

export interface SendDmTextMessageArgs {
  apiUrl?: string
  apiKey: string
  to: string
  text: string
}

export interface SendDmMediaMessageArgs {
  apiUrl?: string
  apiKey: string
  to: string
  link: string
  caption?: string
  filename?: string
}

export interface SendDmResult {
  messageId: string
}

/**
 * Send a WhatsApp text message using the built-in Direct DM API adapter.
 */
export async function sendSendDmText(args: SendDmTextMessageArgs): Promise<SendDmResult> {
  const { apiUrl = 'https://api.send.dm/v1', apiKey, to, text } = args
  const phone = sanitizePhoneForMeta(to)

  const response = await fetch(`${apiUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      to: phone,
      type: 'text',
      text: { body: text },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Direct DM send failed (${response.status}): ${errorText}`)
  }

  const json = await response.json().catch(() => ({ id: `dm_${Date.now()}` }))
  return { messageId: json.id || json.messageId || `dm_${Date.now()}` }
}

/**
 * Send a document / PDF quotation using the built-in Direct DM API adapter.
 */
export async function sendSendDmMedia(args: SendDmMediaMessageArgs): Promise<SendDmResult> {
  const { apiUrl = 'https://api.send.dm/v1', apiKey, to, link, caption, filename } = args
  const phone = sanitizePhoneForMeta(to)

  const response = await fetch(`${apiUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      to: phone,
      type: 'document',
      document: {
        link,
        caption: caption || undefined,
        filename: filename || 'Quotation.pdf',
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Direct DM document send failed (${response.status}): ${errorText}`)
  }

  const json = await response.json().catch(() => ({ id: `dm_media_${Date.now()}` }))
  return { messageId: json.id || json.messageId || `dm_media_${Date.now()}` }
}
