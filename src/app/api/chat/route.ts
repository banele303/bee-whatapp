import { streamText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';

export const maxDuration = 30;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawMessages = body.messages || [];

    // Sanitize messages to standard ChatMessage shape
    const formattedMessages: ChatMessage[] = rawMessages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: typeof m.content === 'string' ? m.content : String(m.content || ''),
    }));

    const result = streamText({
      model: deepseek('deepseek-chat'),
      system: "You are WACRM's Auto-Sourcing Copilot. You help automotive suppliers and CRM users find parts, check stock availability, generate quotes, and automate catalog sourcing in South Africa.\n\nSTRICT NEGATIVE CONSTRAINT:\nNEVER output disclaimer text such as 'Unfortunately, I am a text-based AI assistant', 'I cannot directly create, generate, or attach downloadable PDF files', or instructions on how to use Google Docs/SmallPDF/Word to convert text. You HAVE full 1-click PDF generation built into the WACRM interface!\n\nCRITICAL SOURCING & PRICE REQUIREMENTS:\n1. Facebook Marketplace & SA Suppliers: ALWAYS include Facebook Marketplace South Africa, Gumtree SA, Goldwagen, Masterparts, Midas, and Toyota SA in your sourcing search.\n2. Cheapest Price Priority: ALWAYS rank search results to highlight the CHEAPEST price option first at the very top of your response (e.g. '🏷️ Lowest Price Found: R450').\n3. Direct Product Links: ALWAYS provide direct URL links to the listing or product page (e.g. '[View Listing on Facebook Marketplace](https://facebook.com/marketplace/item/...)').\n4. Listing Images: ALWAYS include product preview image markdown tags `![part preview](image_url)` so photos render directly in the user's chat response.\n5. Currency: ALWAYS display all prices, estimates, and quotes in South African Rands (ZAR / R).\n6. Quote Delivery: When generating a quote, present the clean itemized ZAR pricing table with 15% VAT and state: 'Here is your quotation! Click the **Download Official ZAR PDF Quote** button below to download or print your official PDF.'",
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
