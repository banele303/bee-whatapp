import { streamText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import {
  searchInventoryTool,
  createQuoteTool,
  sourceOutOfStockPartTool,
  sendWhatsAppMessageTool,
} from '@/lib/ai/tools/parts-tools';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawMessages = body.messages || [];
    const accountId = body.accountId || '';

    const lastUserMsg = [...rawMessages].reverse().find((m: any) => m.role === 'user')?.content || '';

    let liveContext = '';

    // 1. Check if user requested sending WhatsApp message
    const phoneMatch = lastUserMsg.match(/(\+?27\d{9}|0[678]\d{8})/);
    if (lastUserMsg.toLowerCase().includes('whatsapp') && phoneMatch) {
      try {
        const waTool = sendWhatsAppMessageTool(accountId);
        const waRes = await waTool.execute({
          phoneNumber: phoneMatch[0],
          message: lastUserMsg,
        });
        liveContext += `\n\n[System WhatsApp Dispatch Action]: Dispatched message to ${phoneMatch[0]}. Result: ${JSON.stringify(waRes)}`;
      } catch (waErr: any) {
        liveContext += `\n\n[System WhatsApp Dispatch Action]: Failed to send to ${phoneMatch[0]}: ${waErr?.message}`;
      }
    }

    // 2. Pre-execute search inventory & web sourcing for parts queries
    if (
      lastUserMsg.toLowerCase().includes('search') ||
      lastUserMsg.toLowerCase().includes('find') ||
      lastUserMsg.toLowerCase().includes('source') ||
      lastUserMsg.toLowerCase().includes('brake') ||
      lastUserMsg.toLowerCase().includes('part') ||
      lastUserMsg.toLowerCase().includes('quote') ||
      lastUserMsg.toLowerCase().includes('hilux') ||
      lastUserMsg.toLowerCase().includes('toyota')
    ) {
      try {
        const invTool = searchInventoryTool(accountId);
        const invRes = await invTool.execute({ query: lastUserMsg });
        
        const sourcingRes = await sourceOutOfStockPartTool.execute({ partName: lastUserMsg });

        liveContext += `\n\n[Live System Sourcing Data]:
Local Catalog Inventory Check: ${JSON.stringify(invRes)}
External Web Sourcing (Goldwagen SA, Masterparts SA, Facebook Marketplace SA): ${JSON.stringify(sourcingRes)}`;
      } catch (err) {
        console.error('[API /api/chat] Pre-search error:', err);
      }
    }

    const formattedMessages = rawMessages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: typeof m.content === 'string' ? m.content : String(m.content || ''),
    }));

    if (liveContext) {
      formattedMessages.push({
        role: 'user',
        content: `[System Instructions: Use the live sourcing data below to produce a complete, multi-part answer immediately without stopping or asking for follow-ups]: ${liveContext}`,
      });
    }

    const result = streamText({
      model: deepseek('deepseek-chat'),
      system: `You are WACRM's Auto-Sourcing Copilot. You help South African workshops and automotive suppliers find car parts, check inventory stock, compare prices, generate quotes, and automate web sourcing.

STRICT NEGATIVE CONSTRAINT:
NEVER output disclaimer text such as "Unfortunately, I am a text-based AI assistant", "I cannot directly create, generate, or attach downloadable PDF files", or instructions on how to use external PDF converters. You HAVE full 1-click PDF generation built into the WACRM interface!

CRITICAL SOURCING & LINK RULES:
1. COMPLETE RESPONSE: Always present the full search & sourcing findings immediately. Never stop mid-sentence or say "I will search..." without giving the final results right away.
2. CHEAPEST PRICE FIRST: Always rank search results to highlight the CHEAPEST price option first at the top of your answer (e.g., '🏷️ Lowest Price Found: R445.00').
3. REAL WORKING PRODUCT LINKS: Use the EXACT target item links provided in [Live System Sourcing Data]. Never output fake '...' URLs. Each supplier option MUST include a direct clickable link to that specific search/part section:
   - Facebook Marketplace SA: [View Listing on Facebook Marketplace SA](https://www.facebook.com/marketplace/search/?query=...)
   - Goldwagen SA: [View Catalog on Goldwagen SA](https://www.goldwagen.com/search?q=...)
   - Masterparts SA: [View Catalog on Masterparts SA](https://www.masterparts.com/?s=...)
   - Midas SA: [View Catalog on Midas SA](https://www.midas.co.za/)
4. REAL PART PHOTOS: Only render image markdown tags ![Part Image](imageUrl) if a real scraped imageUrl exists in [Live System Sourcing Data]. Do NOT output generic demo stock photos if no image is available.
5. CURRENCY & VAT: Always display all prices in ZAR (Rands). Include 15% South African VAT in itemized pricing tables.
6. TABLE NEWLINES: ALWAYS place a double newline (\n\n) BEFORE starting any markdown table and AFTER finishing a markdown table. NEVER attach table pipes '|' directly to heading text on the same line.
7. NO HTML TAGS: NEVER output raw HTML line break tags like <br> or <br/>. Always use standard markdown paragraph breaks and double newlines.
8. QUOTATION DELIVERABLE: When generating a quote, present the clean itemized ZAR table with Subtotal, 15% VAT, and Total Amount, and state: "Here is your official quotation! Click the **Download ZAR PDF Quote** button below to generate your printable PDF or **Send via WhatsApp** to dispatch it instantly."`,
      messages: formattedMessages,
    });

    if (typeof (result as any).toDataStreamResponse === 'function') {
      return (result as any).toDataStreamResponse();
    }
    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('[API /api/chat Error]:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to process chat request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
