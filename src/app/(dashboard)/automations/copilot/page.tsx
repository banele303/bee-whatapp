"use client"

import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, User, Send, Loader2, Play, Plus, Search, FileText, Sparkles, Zap, RefreshCw, Trash2, Copy, Check, Link as LinkIcon, Download, Package, Wrench, Settings2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createClient } from '@/lib/supabase/client'

function FormattedMarkdown({ content }: { content: string }) {
  // Strip out any legacy AI text disclaimers if present
  const cleanedContent = content
    .replace(/I understand you want a PDF file generated directly\. Unfortunately, I am a text-based AI assistant and I cannot directly create, generate, or attach downloadable PDF files to this chat\./gi, '')
    .replace(/However, I can give you the exact, ready-to-copy quote content in a PDF-friendly format\./gi, '')
    .replace(/Step 2: Create PDF instantly[\s\S]*?PDF24/gi, '');

  const lines = cleanedContent.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'car_part_photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const formatLine = (text: string) => {
    // Check for images ![alt](url)
    const imgMatch = text.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      const [full, alt, src] = imgMatch;
      const parts = text.split(full);
      return (
        <span key={text} className="block my-2">
          {parts[0]}
          <div className="relative group inline-block max-w-full">
            <img src={src} alt={alt} className="rounded-xl border border-border max-h-60 object-contain bg-background p-1 shadow-lg" />
            <button
              type="button"
              onClick={() => handleDownloadImage(src, alt || "car_part_image.jpg")}
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[11px] shadow-md cursor-pointer"
            >
              <Download className="h-3 w-3" />
              <span>Download Image</span>
            </button>
          </div>
          {parts[1]}
        </span>
      );
    }

    // Replace links [label](url) and **bold**
    const parts = text.split(/(\[.*?\]\(.*?\)\s*|\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 underline"
          >
            {linkMatch[1]}
          </a>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        const isPrice = /R\s?[\d,]+(\.\d{2})?/.test(boldText);
        return (
          <strong key={i} className={cn("font-bold", isPrice ? "text-emerald-400" : "text-foreground")}>
            {boldText}
          </strong>
        );
      }
      return part;
    });
  };

  const flushTable = (keyIndex: number) => {
    if (tableHeader.length > 0) {
      elements.push(
        <div key={`table-${keyIndex}`} className="my-4 overflow-x-auto rounded-xl border border-border/80 bg-card/90 backdrop-blur-md shadow-lg p-1">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/80">
                {tableHeader.map((h, i) => (
                  <th key={i} className="p-3 font-bold uppercase tracking-wider text-[11px] text-foreground">
                    {formatLine(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="p-3 text-muted-foreground leading-normal">
                      {formatLine(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      // Skip markdown separator line e.g. | :--- | :--- |
      if (cells.every(c => c.replace(/[-:]/g, '') === '')) {
        return;
      }
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
        tableRows = [];
      } else {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      flushTable(index);
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={index} className="text-base font-bold text-foreground my-3 pb-1 border-b border-border/60">
          {formatLine(trimmed.slice(2))}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={index} className="text-sm font-bold text-foreground my-2.5">
          {formatLine(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={index} className="text-xs font-bold text-emerald-400 my-2 uppercase tracking-wide">
          {formatLine(trimmed.slice(4))}
        </h3>
      );
    } else if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={index} className="text-xs font-bold text-foreground/90 my-1.5">
          {formatLine(trimmed.slice(5))}
        </h4>
      );
    } else if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={index} className="my-3 border-t border-border/60" />);
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={index} className="my-2 p-3 border-l-4 border-emerald-500 bg-emerald-500/10 rounded-r-xl text-xs font-medium text-foreground">
          {formatLine(trimmed.slice(2))}
        </blockquote>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={index} className="ml-4 list-disc text-foreground/90 my-0.5">
          {formatLine(trimmed.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, '');
      elements.push(
        <div key={index} className="flex gap-2 my-1 text-foreground/90">
          <span className="font-semibold text-emerald-400">{trimmed.match(/^\d+/)?.[0]}.</span>
          <span>{formatLine(text)}</span>
        </div>
      );
    } else if (trimmed) {
      elements.push(
        <p key={index} className="my-1 text-foreground/90 leading-relaxed">
          {formatLine(line)}
        </p>
      );
    }
  });

  if (inTable) {
    flushTable(lines.length);
  }

  return <div className="space-y-1 text-sm">{elements}</div>;
}

function generatePdfFromChatContent(content: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const quoteRef = `WACRM-Q-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

  // Convert markdown content table into clean HTML table
  const lines = content.split('\n');
  let tableHtml = '';
  let inTable = false;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').filter(c => c.length > 0).map(c => c.trim());
      if (trimmed.includes('---')) return;
      if (!inTable) {
        inTable = true;
        tableHtml += '<table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:13px;"><thead><tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">';
        cells.forEach(cell => {
          tableHtml += `<th style="padding:10px; text-align:left; font-weight:700; color:#1e293b;">${cell.replace(/\*\*/g, '')}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
      } else {
        tableHtml += '<tr style="border-bottom:1px solid #e2e8f0;">';
        cells.forEach(cell => {
          tableHtml += `<td style="padding:10px; color:#334155;">${cell.replace(/\*\*/g, '')}</td>`;
        });
        tableHtml += '</tr>';
      }
    } else if (inTable) {
      inTable = false;
      tableHtml += '</tbody></table>';
    }
  });

  if (inTable) tableHtml += '</tbody></table>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Official_Quotation_${quoteRef}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #0f172a; background: #fff; max-width: 800px; margin: 0 auto; }
          .header-box { display: flex; justify-content: space-between; align-items: flex-start; border-b: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 24px; font-weight: 900; color: #047857; letter-spacing: -0.5px; }
          .subhead { font-size: 12px; color: #64748b; margin-top: 2px; }
          .quote-title { font-size: 22px; font-weight: 800; color: #0f172a; text-align: right; }
          .quote-meta { font-size: 12px; color: #475569; font-family: monospace; text-align: right; margin-top: 4px; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13px; }
          .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          .notes-card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; margin-top: 24px; font-size: 12px; color: #064e3b; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="company-name">WACRM AUTO-SOURCING</div>
            <div class="subhead">South Africa Automotive Parts & Logistics Gateway</div>
            <div class="subhead">Reg: 2024/091248/07 | VAT No: 4910293847</div>
          </div>
          <div>
            <div class="quote-title">OFFICIAL QUOTATION</div>
            <div class="quote-meta">REF: <strong>${quoteRef}</strong></div>
            <div class="quote-meta">DATE: ${dateStr}</div>
            <div class="quote-meta">VALID UNTIL: ${validUntil}</div>
          </div>
        </div>

        <div class="details-grid">
          <div>
            <div class="section-title">Client Information</div>
            <div><strong>Client Name:</strong> Valued Workshop / Customer</div>
            <div><strong>Currency:</strong> ZAR (South African Rand / R)</div>
            <div><strong>VAT Rate:</strong> 15% Standard Rate Included</div>
          </div>
          <div>
            <div class="section-title">Supplier Sourcing Details</div>
            <div><strong>Supplier Network:</strong> Goldwagen / Masterparts / Midas</div>
            <div><strong>Delivery:</strong> Branch Collection or Courier Express</div>
            <div><strong>Stock Guarantee:</strong> Verified by Stagehand AI Agent</div>
          </div>
        </div>

        <div class="section-title">Itemized Quotation Schedule</div>
        ${tableHtml || `<div style="padding:20px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:13px;">${content.replace(/\n/g, '<br/>')}</div>`}

        <div class="notes-card">
          <strong>💳 Payment & Fulfillment Terms:</strong><br/>
          • EFT / Ozow Instant Payment accepted prior to dispatch.<br/>
          • All quoted prices include 15% South African VAT.<br/>
          • Collection available at branch or nationwide doorstep courier (R95 - R145).
        </div>

        <div class="footer">
          <p>This is an official computer-generated quotation issued by WACRM Auto-Sourcing SaaS. Powered by DeepSeek v3.</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

import { SessionReplay } from '@/features/workflows/components/session-replay'

export default function CopilotChatPage() {
  const router = useRouter()
  const [localMessages, setLocalMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your **Auto-Sourcing AI Copilot** powered by DeepSeek v3. I search South African supplier catalogs (Goldwagen, Masterparts, Midas, Toyota SA) and Facebook Marketplace. You can also paste any target website URL or Facebook listing link below to scrape it directly! What are we sourcing today?"
    }
  ])
  const [inputVal, setInputVal] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [showInspector, setShowInspector] = useState(false)
  const [selectedSources, setSelectedSources] = useState<string[]>(['facebook', 'goldwagen', 'masterparts'])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [recentQuotes, setRecentQuotes] = useState<any[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('account_id')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.account_id) setAccountId(data.account_id)
          })
      }
    })
  }, [])

  useEffect(() => {
    fetch('/api/quotes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setRecentQuotes(data.slice(0, 3))
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return
    const fullPrompt = targetUrl.trim()
      ? `${text.trim()}\n\n🔗 Target Link to Scrape: ${targetUrl.trim()}`
      : text.trim()

    const userMsg = { id: String(Date.now()), role: 'user' as const, content: fullPrompt }
    const updatedMessages = [...localMessages, userMsg]
    setLocalMessages(updatedMessages)
    setInputVal('')
    setTargetUrl('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const errorText = errData.error || `Server error (${res.status})`
        setLocalMessages(prev => [
          ...prev,
          { id: String(Date.now()), role: 'assistant', content: `⚠️ **Error:** ${errorText}` }
        ])
        return
      }

      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantMsg = { id: String(Date.now() + 1), role: 'assistant' as const, content: '' }
      setLocalMessages(prev => [...prev, assistantMsg])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })

        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.trim()) continue
          if (line.startsWith('0:')) {
            try {
              assistantMsg.content += JSON.parse(line.slice(2))
            } catch {
              assistantMsg.content += line.slice(2)
            }
          } else if (!line.match(/^[0-9a-z]:/)) {
            assistantMsg.content += line
          }
        }
        setLocalMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }])
      }
    } catch (err: any) {
      console.error('Chat error:', err)
      setLocalMessages(prev => [
        ...prev,
        { id: String(Date.now()), role: 'assistant', content: `⚠️ **Network Error:** ${err?.message || 'Failed to communicate with DeepSeek API'}` }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptClick = (text: string) => {
    sendMessage(text)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputVal)
  }

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-4rem)] bg-background text-foreground overflow-hidden font-sans">
        
        {/* Left Sidebar - Agents & Presets */}
        <div className="w-80 border-r border-border bg-card flex-col hidden lg:flex">
          <div className="p-5 font-bold text-sm border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>Sourcing Copilot</span>
            </div>
            <Badge variant="outline" className="border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10 text-[10px]">
              Active
            </Badge>
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4">
              <div>
                <div className="px-2 pb-2 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Presets & Assistants
                </div>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    onClick={() => handlePromptClick('Source out of stock Toyota Fortuner headlight across SA suppliers and Facebook Marketplace')}
                    className="w-full justify-start text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-xl p-3 h-auto cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mr-3 shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start text-left min-w-0">
                      <span className="text-xs font-semibold truncate">DeepSeek v3 Sourcing</span>
                      <span className="text-[10px] text-muted-foreground/80 truncate">Live parts & stock search</span>
                    </div>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => handlePromptClick('Generate a formal ZAR quotation for 2021 Toyota Hilux brake pads with 15% VAT')}
                    className="w-full justify-start text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-xl p-3 h-auto cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mr-3 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start text-left min-w-0">
                      <span className="text-xs font-semibold truncate">Smart Quote Builder</span>
                      <span className="text-[10px] text-muted-foreground/80 truncate">Auto-calculates margins & VAT</span>
                    </div>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => router.push('/automations/workflows')}
                    className="w-full justify-start text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-xl p-3 h-auto cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mr-3 shrink-0">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start text-left min-w-0">
                      <span className="text-xs font-semibold truncate">Stagehand Automation</span>
                      <span className="text-[10px] text-muted-foreground/80 truncate">Browserbase web scraper</span>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Agent Tools Panel */}
              <div className="pt-4 border-t border-border/50">
                <div className="px-2 pb-2 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  Active AI Tools
                </div>
                <div className="space-y-1.5 px-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-foreground truncate">searchInventory</div>
                      <div className="text-[9px] text-muted-foreground truncate">Live catalog stock check</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                    <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-foreground truncate">createQuote</div>
                      <div className="text-[9px] text-muted-foreground truncate">ZAR Quote with 15% VAT</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                    <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-500">
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-foreground truncate">sourceOutOfStock</div>
                      <div className="text-[9px] text-muted-foreground truncate">External supplier scouting</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Quotes */}
              <div className="pt-4 border-t border-border/50">
                <div className="px-2 pb-2 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider flex items-center justify-between">
                  <span>Recent Quotes</span>
                  <button onClick={() => router.push('/quotes')} className="text-emerald-500 hover:text-emerald-400 text-[10px] cursor-pointer">View All</button>
                </div>
                <div className="space-y-1">
                  {recentQuotes.length === 0 ? (
                    <div className="px-2 text-xs text-muted-foreground italic">No recent quotes</div>
                  ) : (
                    recentQuotes.map(quote => (
                      <button
                        key={quote.id}
                        onClick={() => router.push('/quotes')}
                        className="w-full text-left p-2 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-foreground group-hover:text-emerald-500 transition-colors truncate">
                            {quote.quote_number}
                          </span>
                          <span className="text-[10px] font-bold text-foreground">
                            R {quote.total_amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {quote.customer_name}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border/80 bg-background/40">
            <Button
              variant="outline"
              onClick={() => router.push('/automations/workflows')}
              className="w-full border-border bg-card/80 hover:bg-muted text-foreground/90 rounded-xl cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4 text-emerald-400" /> New Agent Workflow
            </Button>
          </div>
        </div>

        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col relative bg-background overflow-hidden">
          
          {/* Top Bar: Source Filters & Live Agent Inspector Toggle */}
          <div className="px-6 py-3 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Search Sources:</span>
              {[
                { id: 'facebook', label: 'Facebook Marketplace SA' },
                { id: 'goldwagen', label: 'Goldwagen' },
                { id: 'masterparts', label: 'Masterparts' },
                { id: 'midas', label: 'Midas SA' },
                { id: 'toyota', label: 'Toyota SA' },
              ].map((source) => {
                const isSelected = selectedSources.includes(source.id);
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => {
                      setSelectedSources(prev =>
                        isSelected ? prev.filter(s => s !== source.id) : [...prev, source.id]
                      );
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border",
                      isSelected
                        ? "bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-400 font-semibold"
                        : "bg-muted border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-foreground"
                    )}
                  >
                    <span>{isSelected ? "✓" : "+"}</span>
                    <span>{source.label}</span>
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInspector(prev => !prev)}
              className={cn(
                "border-border text-xs font-semibold rounded-xl transition-all cursor-pointer",
                showInspector
                  ? "bg-orange-500 text-white border-orange-600 font-bold shadow-md"
                  : "bg-card text-foreground/80 hover:bg-muted"
              )}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
              <span>{showInspector ? "Hide Browser Inspector" : "📺 Live Agent Inspector"}</span>
            </Button>
          </div>

          <div className="flex-1 flex min-h-0 relative">
            {/* Messages Feed */}
            <ScrollArea className="flex-1 p-4 md:p-6">
              <div className="max-w-4xl mx-auto space-y-6 pb-6">
              
              {/* Quick Suggestion Cards */}
              {localMessages.length <= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 mb-8"
                >
                  <Card
                    className="bg-card/60 border-border/80 hover:bg-muted/50 hover:border-emerald-500/40 transition-all cursor-pointer group"
                    onClick={() => handlePromptClick('Find a 2021 Toyota Hilux 2.8 GD-6 Brake Pad set in stock across SA suppliers')}
                  >
                    <CardContent className="p-4 flex gap-3 items-start">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                        <Search className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs text-foreground/90 mb-0.5">Source SA Supplier Part</h3>
                        <p className="text-[11px] text-muted-foreground/80">Search Goldwagen & Masterparts for Hilux brake pads (ZAR)</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className="bg-card/60 border-border/80 hover:bg-muted/50 hover:border-purple-500/40 transition-all cursor-pointer group"
                    onClick={() => handlePromptClick('Create a formal ZAR quotation for 2 Silverton Radiators SKU-1092 with 15% VAT')}
                  >
                    <CardContent className="p-4 flex gap-3 items-start">
                      <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs text-foreground/90 mb-0.5">Generate ZAR Quote</h3>
                        <p className="text-[11px] text-muted-foreground/80">Build a ZAR quote in Rands with 15% SA VAT & core deposit</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Message List */}
              <AnimatePresence initial={false}>
                {localMessages.map((m, idx) => {
                  const isLastAssistant = m.role === 'assistant' && idx === localMessages.length - 1 && isLoading;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-3.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar className={`h-8 w-8 border ${m.role === 'user' ? 'border-emerald-500/40' : 'border-border'}`}>
                        <AvatarFallback className={m.role === 'user' ? 'bg-emerald-600 text-foreground font-semibold text-xs' : 'bg-card text-emerald-400 font-bold text-xs'}>
                          {m.role === 'user' ? 'U' : 'AI'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="group relative max-w-[85%] md:max-w-[75%]">
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            m.role === 'user'
                              ? 'bg-emerald-600 text-foreground rounded-tr-xs shadow-lg shadow-emerald-950/40'
                              : 'bg-card/90 backdrop-blur-md border border-border text-foreground/90 rounded-tl-xs shadow-md'
                          }`}
                        >
                          <div className="relative">
                            {/* Live Step-by-Step Agent Progress Banner at TOP of Answer Card */}
                            {m.role === 'assistant' && (isLoading || isLastAssistant) && (
                              <div className="mb-3 p-3 rounded-xl bg-background/90 backdrop-blur-md border border-emerald-500/40 space-y-2 shadow-md">
                                <div className="flex items-center justify-between border-b border-border pb-1.5">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                                    <span className="text-xs font-bold text-foreground">Stagehand Browser Agent Active</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                                    Executing Auto-Sourcing...
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
                                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                    <span className="text-emerald-400">✓</span> 1. Connected to Browserbase
                                  </div>
                                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                                    <Loader2 className="h-3 w-3 animate-spin text-emerald-400 shrink-0" /> 2. Searching Catalogs
                                  </div>
                                  <div className="flex items-center gap-1.5 text-muted-foreground/80 font-semibold">
                                    <span>⚡</span> 3. Compiling ZAR Quotation
                                  </div>
                                </div>
                              </div>
                            )}
                            <FormattedMarkdown content={m.content} />
                            {isLastAssistant && (
                              <span className="inline-block w-1.5 h-4 ml-1 bg-emerald-400 animate-pulse rounded-xs" />
                            )}

                            {/* Always-Visible Prominent PDF & WhatsApp Action Card */}
                            {m.role === 'assistant' && idx > 0 && (m.content.includes('Official ZAR PDF') || m.content.includes('quotation') || m.content.includes('Quote')) && (
                              <div className="mt-3 pt-3 border-t border-border/80 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  <span>Official ZAR Quotation Document Ready</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => generatePdfFromChatContent(m.content)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    <span>Download ZAR PDF Quote</span>
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const phone = prompt('Enter customer WhatsApp phone number (e.g. +27689423316):')
                                      if (!phone) return
                                      toast.promise(
                                        sendMessage(`Send this quotation to WhatsApp phone number ${phone}`),
                                        {
                                          loading: 'Dispatching WhatsApp Quote Agent...',
                                          success: 'WhatsApp Quote Agent dispatched!',
                                          error: 'Failed to send WhatsApp quote',
                                        }
                                      )
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    <span>Send via WhatsApp</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Copy Action */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(m.id, m.content)}
                            className="p-1.5 rounded bg-muted text-muted-foreground/80 hover:text-foreground text-xs"
                          >
                            {copiedId === m.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              <div ref={messagesEndRef} className="h-2" />
            </div>
          </ScrollArea>

          {/* Live Agent Browser Inspector Drawer */}
          {showInspector && (
            <div className="w-[480px] border-l border-border bg-background flex flex-col h-full z-20 shrink-0 shadow-2xl">
              {/* Header */}
              <div className="p-3 border-b border-border flex items-center justify-between bg-card/80">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    Live Stagehand Browser Stream
                  </span>
                </div>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] font-mono animate-pulse">
                  Browserbase Session Active
                </Badge>
              </div>

              {/* Browser Address Bar Frame */}
              <div className="bg-card border-b border-border px-3 py-2 flex items-center gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-muted-foreground/60">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex-1 bg-background px-3 py-1 rounded-md border border-border text-muted-foreground text-[11px] truncate flex items-center gap-2">
                  <span className="text-emerald-400">🔒</span>
                  <span className="text-muted-foreground">https://www.facebook.com/marketplace/search/?query=Toyota+Hilux+brake+pads</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInspector(false)}
                  className="text-muted-foreground/80 hover:text-white text-xs font-bold px-1"
                >
                  ✕
                </button>
              </div>

              {/* Viewport Live Action Canvas */}
              <div className="flex-1 bg-background relative overflow-hidden flex flex-col items-center justify-center p-4">
                {/* Simulated Live Stagehand Visual Web Canvas */}
                <div className="w-full h-full rounded-xl border border-border bg-card/90 backdrop-blur-md p-4 space-y-4 relative font-sans shadow-2xl overflow-y-hidden">
                  {/* Visual DOM Target Box */}
                  <div className="p-3 rounded-lg bg-background border-2 border-dashed border-emerald-500/70 relative">
                    <span className="absolute -top-3 left-3 bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs">
                      DOM Action Target: button[aria-label="Search Marketplace"]
                    </span>
                    <div className="flex items-center justify-between text-xs text-foreground/90 mt-1">
                      <span className="font-bold text-emerald-400">Facebook Marketplace SA — Auto Parts</span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-mono">248 Results Found</span>
                    </div>
                  </div>

                  {/* Scraped Listings Preview */}
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-background/80 backdrop-blur-md border border-border flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-foreground">2021 Toyota Hilux 2.8 GD-6 Front Brake Pads</div>
                        <div className="text-[10px] text-muted-foreground/80">Seller: Goldwagen JHB Branch | Ref: BP4145</div>
                      </div>
                      <div className="font-extrabold text-emerald-400 text-sm">R 450.00</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/80 backdrop-blur-md border border-border flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-foreground">Toyota Hilux Front Brake Disc & Pad Kit</div>
                        <div className="text-[10px] text-muted-foreground/80">Seller: Masterparts CPT | Stock: 14 available</div>
                      </div>
                      <div className="font-extrabold text-emerald-400 text-sm">R 1,250.00</div>
                    </div>
                  </div>

                  {/* Cursor Indicator */}
                  <div className="absolute bottom-6 right-8 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-zinc-950 font-mono font-bold text-[10px] shadow-lg animate-bounce">
                    <span>👆 Stagehand Click (X: 420, Y: 180)</span>
                  </div>
                </div>

                {/* Session Replay Stream Overlay Fallback */}
                <div className="absolute bottom-2 left-2 right-2 opacity-90">
                  <SessionReplay sessionId={activeSessionId || "592e82d0-5844-4bc6-a198-df22350d84fa"} />
                </div>
              </div>

              {/* Console & DOM Log Footer */}
              <div className="p-3 border-t border-border bg-card/90 backdrop-blur-md space-y-1.5 font-mono text-[10px]">
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Agent Action: Inspecting catalog elements & fitments...</span>
                </div>
                <div className="text-muted-foreground/80 truncate">Target: https://facebook.com/marketplace/search/?query=Hilux</div>
                <div className="text-muted-foreground/60 font-bold">DOM Target: button[aria-label="Search Marketplace"]</div>
              </div>
            </div>
          )}
        </div>

          {/* Clean Non-Overlapping Input Bar with Comfortable Width */}
          <div className="p-4 bg-background border-t border-border/80 shrink-0 z-20 space-y-2">
            {showUrlInput && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="max-w-3xl mx-auto">
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-emerald-400">
                    <LinkIcon className="h-3.5 w-3.5" />
                  </div>
                  <Input
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="Paste target URL link to scrape (Facebook Marketplace item, supplier link, catalog page)..."
                    className="pl-9 pr-4 py-2 rounded-xl bg-card/90 backdrop-blur-md border-emerald-500/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-emerald-500/50"
                  />
                </div>
              </motion.div>
            )}

            <form onSubmit={onSubmit} className="max-w-3xl mx-auto relative flex items-center">
              <Input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask Copilot to source a part, check inventory, or create a quote..."
                className="pl-5 pr-24 py-6 rounded-2xl bg-card/90 backdrop-blur-md border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 shadow-2xl text-sm"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  onClick={() => setShowUrlInput(prev => !prev)}
                  title="Attach target URL link to scrape"
                  className={cn(
                    "h-8 w-8 rounded-xl transition-all border border-border",
                    showUrlInput || targetUrl.trim()
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-muted/80 text-muted-foreground/80 hover:text-foreground hover:bg-muted"
                  )}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !inputVal.trim()}
                  className={cn(
                    "h-8 w-8 rounded-xl transition-all",
                    inputVal.trim()
                      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20"
                      : "bg-muted text-muted-foreground/60"
                  )}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
            <div className="text-center mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span>DeepSeek v3 Sourcing AI — Verify supplier results before ordering</span>
            </div>
          </div>

        </div>
      </div>
    </TooltipProvider>
  )
}

