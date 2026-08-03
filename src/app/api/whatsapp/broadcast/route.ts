import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTemplateMessage } from '@/lib/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/encryption'
import type { SendTimeParams } from '@/lib/whatsapp/template-send-builder'
import { isMessageTemplate } from '@/lib/whatsapp/template-row-guard'
import {
  sanitizePhoneForMeta,
  isValidE164,
  phoneVariants,
  isRecipientNotAllowedError,
} from '@/lib/whatsapp/phone-utils'
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'

interface BroadcastResult {
  phone: string
  status: 'sent' | 'failed'
  whatsapp_message_id?: string
  error?: string
}

/**
 * Two input shapes are accepted:
 *
 *   NEW (preferred — supports per-recipient variable substitution):
 *     {
 *       recipients: Array<{ phone: string; params: string[] }>,
 *       template_name, template_language
 *     }
 *
 *   LEGACY (all phones receive the same params — kept so existing
 *   callers don't break):
 *     {
 *       phone_numbers: string[],
 *       template_params: string[],
 *       template_name, template_language
 *     }
 *
 * Previous implementation only supported the legacy shape, and the
 * sending hook was forced to ship every batch with `templateParams[0]`
 * — meaning every recipient got contact-0's personalization. The new
 * shape is what actually fixes that.
 */
interface NewRecipient {
  phone: string
  /** Body variable values, one per {{N}}. Legacy field. */
  params?: string[]
  /**
   * Structured per-send values (header text variable, media URL
   * override, URL/COPY_CODE button values). When set, takes
   * precedence over `params` for the body too — see
   * sendTemplateMessage for the merge rules.
   */
  messageParams?: SendTimeParams
}

export async function POST(request: Request) {
  const reqId = Math.random().toString(36).slice(2, 8).toUpperCase()
  console.log(`[BROADCAST:${reqId}] ── POST /api/whatsapp/broadcast ──────────────────`)
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error(`[BROADCAST:${reqId}] FAIL auth — authError:`, authError?.message ?? 'no user session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log(`[BROADCAST:${reqId}] STEP 1 auth OK — user: ${user.id}`)

    // Per-user broadcast budget. Note: this limits how often a user
    // can *start* a campaign, not how many messages go out inside
    // one — the fan-out loop below runs without additional gating.
    const limit = checkRateLimit(`broadcast:${user.id}`, RATE_LIMITS.broadcast)
    if (!limit.success) {
      return rateLimitResponse(limit)
    }

    // Resolve the caller's account_id. whatsapp_config + templates
    // + broadcasts are all account-scoped post-multi-user, so the
    // old `.eq('user_id', user.id)` filters miss every row created
    // by a teammate.
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    const accountId = profile?.account_id as string | undefined
    if (!accountId) {
      console.error(`[BROADCAST:${reqId}] FAIL account — no account_id on profile for user ${user.id}`)
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }
    console.log(`[BROADCAST:${reqId}] STEP 2 account OK — accountId: ${accountId}`)

    const body = await request.json()
    const {
      recipients: newRecipients,
      phone_numbers,
      template_name,
      template_language,
      template_params,
    } = body

    console.log(`[BROADCAST:${reqId}] STEP 3 payload — template: "${template_name}" lang: "${template_language}" newRecipients: ${Array.isArray(newRecipients) ? newRecipients.length : 'none'} phone_numbers: ${Array.isArray(phone_numbers) ? phone_numbers.length : 'none'}`)

    // Normalize to a list of {phone, params} regardless of shape.
    let recipients: NewRecipient[]
    if (Array.isArray(newRecipients) && newRecipients.length > 0) {
      recipients = newRecipients
    } else if (Array.isArray(phone_numbers) && phone_numbers.length > 0) {
      const shared: string[] = Array.isArray(template_params)
        ? template_params
        : []
      recipients = phone_numbers.map((phone: string) => ({
        phone,
        params: shared,
      }))
    } else {
      console.error(`[BROADCAST:${reqId}] FAIL payload — no recipients or phone_numbers provided`)
      return NextResponse.json(
        {
          error:
            'Provide either `recipients` (preferred) or `phone_numbers` — must be a non-empty array',
        },
        { status: 400 }
      )
    }

    if (!template_name) {
      console.error(`[BROADCAST:${reqId}] FAIL payload — template_name missing`)
      return NextResponse.json(
        { error: 'template_name is required' },
        { status: 400 }
      )
    }
    console.log(`[BROADCAST:${reqId}] STEP 3 OK — ${recipients.length} recipient(s), template: "${template_name}"`)

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', accountId)
      .single()

    if (configError || !config) {
      console.error(`[BROADCAST:${reqId}] FAIL whatsapp_config — configError: ${configError?.message ?? 'no config row found'} for account ${accountId}`)
      return NextResponse.json(
        {
          error:
            'WhatsApp not configured. Please set up your WhatsApp integration first.',
        },
        { status: 400 }
      )
    }
    console.log(`[BROADCAST:${reqId}] STEP 4 config OK — phone_number_id: ${config.phone_number_id} waba_id: ${config.waba_id ?? 'NOT SET'}`)

    const accessToken = decrypt(config.access_token)

    // Load the template row once so sendTemplateMessage can build
    // header + button components on each iteration. Loading inside
    // the loop would N+1 against Supabase for every recipient.
    // Guard against a malformed local row crashing every send in
    // the loop with the same opaque TypeError — fail loudly once.
    const templateLang = template_language || 'en_US'
    console.log(`[BROADCAST:${reqId}] STEP 5 looking up template — name: "${template_name}" language: "${templateLang}" account_id: ${accountId}`)
    const { data: rawTemplateRow, error: templateLookupError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('account_id', accountId)
      .eq('name', template_name)
      .eq('language', templateLang)
      .maybeSingle()
    if (templateLookupError) {
      console.error(`[BROADCAST:${reqId}] FAIL template lookup DB error — ${templateLookupError.message}`)
    }
    if (!rawTemplateRow) {
      console.warn(`[BROADCAST:${reqId}] WARN template not found locally — name: "${template_name}" lang: "${templateLang}" account: ${accountId}. Will attempt Meta send without local row (no header/button components).`)
    } else {
      console.log(`[BROADCAST:${reqId}] STEP 5 template found — id: ${rawTemplateRow.id} status: ${rawTemplateRow.status} header_type: ${rawTemplateRow.header_type ?? 'none'} buttons: ${rawTemplateRow.buttons ? JSON.stringify(rawTemplateRow.buttons).slice(0, 80) : 'none'}`)
    }
    if (rawTemplateRow && !isMessageTemplate(rawTemplateRow)) {
      console.error(`[BROADCAST:${reqId}] FAIL template malformed — row failed isMessageTemplate guard. Row keys: ${Object.keys(rawTemplateRow).join(', ')}`)
      return NextResponse.json(
        {
          error:
            'Template row is malformed locally — run "Sync from Meta" in Settings to repair it before broadcasting.',
        },
        { status: 500 },
      )
    }
    const templateRow = rawTemplateRow ?? null

    const results: BroadcastResult[] = []
    let sentCount = 0
    let failedCount = 0

    for (const recipient of recipients) {
      const sanitized = sanitizePhoneForMeta(recipient.phone)

      if (!isValidE164(sanitized)) {
        results.push({
          phone: recipient.phone,
          status: 'failed',
          error: 'Invalid phone number format',
        })
        failedCount++
        continue
      }

      // Retry with phone variants on "not in allowed list" so numbers
      // that differ only in a trunk-prefix 0 still reach recipients.
      const variants = phoneVariants(sanitized)
      let sentMessageId: string | null = null
      let lastError: string | null = null

      console.log(`[BROADCAST:${reqId}] Sending to phone: ${recipient.phone} → sanitized: ${sanitized} variants: [${variants.join(', ')}] params: ${JSON.stringify(recipient.params ?? [])}`)
      for (const variant of variants) {
        try {
          const result = await sendTemplateMessage({
            phoneNumberId: config.phone_number_id,
            accessToken,
            to: variant,
            templateName: template_name,
            language: template_language || 'en_US',
            template: templateRow ?? undefined,
            messageParams: recipient.messageParams,
            params: recipient.params ?? [],
          })
          sentMessageId = result.messageId
          lastError = null
          console.log(`[BROADCAST:${reqId}] ✓ Sent to ${variant} — messageId: ${sentMessageId}`)
          break
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          console.error(`[BROADCAST:${reqId}] ✗ FAILED to send to ${variant} — error: ${errorMessage}`)
          if (!isRecipientNotAllowedError(errorMessage)) {
            lastError = errorMessage
            break
          }
          lastError = errorMessage
          // retry with next variant
        }
      }

      if (sentMessageId) {
        results.push({
          phone: recipient.phone,
          status: 'sent',
          whatsapp_message_id: sentMessageId,
        })
        sentCount++
      } else {
        console.error(
          `Failed to send broadcast to ${recipient.phone}:`,
          lastError
        )
        results.push({
          phone: recipient.phone,
          status: 'failed',
          error: lastError || 'Unknown error',
        })
        failedCount++
      }
    }

    console.log(`[BROADCAST:${reqId}] ── DONE — total: ${recipients.length} sent: ${sentCount} failed: ${failedCount} ─────────────────`)
    return NextResponse.json({
      success: true,
      total: recipients.length,
      sent: sentCount,
      failed: failedCount,
      results,
    })
  } catch (error) {
    console.error(`[BROADCAST:${reqId}] UNHANDLED ERROR:`, error)
    return NextResponse.json(
      { error: 'Failed to process broadcast' },
      { status: 500 }
    )
  }
}
