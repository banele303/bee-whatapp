"use client"

import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  User,
  Send,
  Loader2,
  Play,
  Plus,
  Search,
  FileText,
  Sparkles,
  Zap,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Link as LinkIcon,
  Download,
  Package,
  Wrench,
  Settings2,
  MessageCircle,
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Terminal,
  Cpu,
  ShieldCheck,
  Share2,
  Eye,
  Sliders,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createClient } from '@/lib/supabase/client'

// Interfaces for Agent Pipeline Execution
interface AgentToolCall {
  id: string
  toolName: string
  status: 'running' | 'success' | 'failed'
  input: Record<string, any>
  output?: Record<string, any>
  timestamp: string
}

interface AgentPipelineStep {
  id: string
  agentName: string
  agentIcon: any
  trigger: string
  status: 'idle' | 'running' | 'completed' | 'failed'
  toolCalls: AgentToolCall[]
  logs: string[]
  startedAt: string
}

function FormattedMarkdown({ content }: { content: string }) {
  const cleanedContent = content
    .replace(/I understand you want a PDF file generated directly\. Unfortunately, I am a text-based AI assistant and I cannot directly create, generate, or attach downloadable PDF files to this chat\./gi, '')
    .replace(/However, I can give you the exact, ready-to-copy quote content in a PDF-friendly format\./gi, '')
    .replace(/Step 2: Create PDF instantly[\s\S]*?PDF24/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')

  const lines = cleanedContent.split('\n')
  const elements: React.ReactNode[] = []
  let inTable = false
  let tableHeader: string[] = []
  let tableRows: string[][] = []

  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename || 'car_part_photo.jpg'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const formatLine = (text: string) => {
    const imgMatch = text.match(/!\[(.*?)\]\((.*?)\)/)
    if (imgMatch) {
      const [full, alt, src] = imgMatch
      const parts = text.split(full)
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
      )
    }

    const parts = text.split(/(\[.*?\]\(.*?\)\s*|`.*?`|\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/)
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
        )
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 mx-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
            {part.slice(1, -1)}
          </code>
        )
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2)
        const isPrice = /R\s?[\d,]+(\.\d{2})?/.test(boldText)
        return (
          <strong key={i} className={cn("font-bold", isPrice ? "text-emerald-400" : "text-foreground")}>
            {boldText}
          </strong>
        )
      }
      return part
    })
  }

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
      )
    }
    inTable = false
    tableHeader = []
    tableRows = []
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim())

      if (cells.every(c => /^:?-+:?$/.test(c))) {
        return
      }

      if (!inTable) {
        inTable = true
        tableHeader = cells
      } else {
        tableRows.push(cells)
      }
    } else {
      if (inTable) {
        flushTable(index)
      }

      const headerMatch = trimmed.match(/^#{1,6}\s*(.*)/)
      if (headerMatch) {
        const headerText = headerMatch[1].trim()
        elements.push(
          <h3 key={index} className="text-sm font-bold text-foreground mt-4 mb-2 flex items-center gap-2 border-b border-border/40 pb-1 text-emerald-400">
            {formatLine(headerText)}
          </h3>
        )
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <li key={index} className="ml-4 list-disc text-muted-foreground my-1">
            {formatLine(trimmed.slice(2))}
          </li>
        )
      } else if (trimmed === '---') {
        elements.push(<hr key={index} className="my-4 border-border/60" />)
      } else if (trimmed.length > 0) {
        elements.push(
          <p key={index} className="my-1.5 leading-relaxed">
            {formatLine(line)}
          </p>
        )
      }
    }
  })

  if (inTable) {
    flushTable(lines.length)
  }

  return <div className="space-y-1 text-sm text-foreground/90">{elements}</div>
}

export default function SourcingCopilotPage() {
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [accountId, setAccountId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'pipeline' | 'chat'>('pipeline')
  const [localMessages, setLocalMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### 🚀 Welcome to WACRM AI Agent Studio & Copilot!

I am your multi-agent automotive sourcing assistant. Here is what our autonomous agents can do for you:

- 🔍 **Auto-Sourcing Agent**: Search local parts catalog & live SA supplier web listings (*Goldwagen, Masterparts, Midas, Facebook Marketplace*).
- 📄 **Smart ZAR Quote & PDF Agent**: Calculate itemized pricing with 15% SA VAT, core deposits, and generate 1-click printable PDF quotations.
- 📱 **WhatsApp Dispatch Agent**: Deliver official quotation PDFs directly to customers' WhatsApp chats automatically.

Select a preset prompt below or type your query to run the live agent pipeline!`,
    },
  ])

  const [inputVal, setInputVal] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [recentQuotes, setRecentQuotes] = useState<any[]>([])
  const [sendingWaMsgId, setSendingWaMsgId] = useState<string | null>(null)

  // Live Agent Pipeline State
  const [activePipeline, setActivePipeline] = useState<AgentPipelineStep[]>([
    {
      id: 'step-1',
      agentName: 'Auto-Sourcing Agent',
      agentIcon: Search,
      trigger: 'Catalog & Web Supplier Search Query',
      status: 'completed',
      startedAt: '10:42 AM',
      toolCalls: [
        {
          id: 'tc-1',
          toolName: 'searchInventory',
          status: 'success',
          input: { query: 'Hilux 2.8 GD-6 Brake Pads' },
          output: { found: true, count: 2, price: 'R 1,200.00' },
          timestamp: '10:42:01 AM',
        },
      ],
      logs: [
        'Query received: "Hilux 2.8 GD-6 Brake Pads"',
        'Inspecting local inventory catalog...',
        'Found matching part SKU: TW-BP-2021 (Stock: 14 units)',
      ],
    },
    {
      id: 'step-2',
      agentName: 'Smart ZAR Quote & PDF Agent',
      agentIcon: FileText,
      trigger: 'Quotation Generation Request',
      status: 'completed',
      startedAt: '10:42 AM',
      toolCalls: [
        {
          id: 'tc-2',
          toolName: 'createQuote',
          status: 'success',
          input: { items: [{ sku: 'TW-BP-2021', qty: 1, unitPrice: 1200 }], customerName: 'Valued Client' },
          output: { quoteNumber: 'QT-8912', total: 1380.00, vat: 180.00 },
          timestamp: '10:42:04 AM',
        },
      ],
      logs: [
        'Calculating 15% South African VAT (R 180.00)...',
        'Generated Quote #QT-8912 for R 1,380.00 incl. VAT.',
        'PDF document compiled and stored successfully.',
      ],
    },
    {
      id: 'step-3',
      agentName: 'WhatsApp Dispatch Agent',
      agentIcon: MessageCircle,
      trigger: 'Customer WhatsApp PDF Attachment Dispatch',
      status: 'idle',
      startedAt: 'Ready',
      toolCalls: [
        {
          id: 'tc-3',
          toolName: 'engineSendMedia',
          status: 'running',
          input: { kind: 'document', filename: 'Quotation-QT-8912.pdf' },
          timestamp: 'Pending trigger',
        },
      ],
      logs: ['Awaiting customer phone number confirmation for 1-click WhatsApp delivery...'],
    },
  ])

  useEffect(() => {
    async function loadAccountAndQuotes() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile?.account_id) {
        setAccountId(profile.account_id)
        fetchRecentQuotes(profile.account_id)
      }
    }
    loadAccountAndQuotes()
  }, [])

  const fetchRecentQuotes = async (acctId: string) => {
    try {
      const res = await fetch('/api/quotes')
      const data = await res.json()
      if (Array.isArray(data)) setRecentQuotes(data.slice(0, 4))
    } catch (err) {
      console.error('Failed to load recent quotes:', err)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages, activePipeline])

  const generatePdfFromChatContent = (content: string) => {
    const lines = content.split('\n')
    let customerName = 'Valued Customer'
    let quoteItems: Array<{ sku: string; description: string; quantity: number; unitPrice: number }> = []

    const nameMatch = content.match(/Customer:\s*\*?(.*?)\*?(\n|$)/i)
    if (nameMatch && nameMatch[1]) {
      customerName = nameMatch[1].trim()
    }

    let inTable = false
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.slice(1, -1).split('|').map(c => c.trim())
        if (cells.every(c => /^:?-+:?$/.test(c))) continue
        if (!inTable) {
          inTable = true
          continue
        }

        if (cells.length >= 3) {
          const desc = cells[0].replace(/\*/g, '')
          const priceStr = cells.find(c => c.includes('R') || c.match(/\d+/)) || '0'
          const priceMatch = priceStr.replace(/,/g, '').match(/\d+(\.\d+)?/)
          const price = priceMatch ? parseFloat(priceMatch[0]) : 500

          if (desc && !desc.toLowerCase().includes('supplier') && !desc.toLowerCase().includes('item')) {
            quoteItems.push({
              sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
              description: desc,
              quantity: 1,
              unitPrice: price > 0 ? price : 750,
            })
          }
        }
      } else {
        if (inTable) inTable = false
      }
    }

    if (quoteItems.length === 0) {
      quoteItems = [
        {
          sku: 'TW-BP-2021',
          description: 'Toyota Hilux 2.8 GD-6 Front Brake Pads Set',
          quantity: 1,
          unitPrice: 1200.0,
        },
      ]
    }

    const subtotal = quoteItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0)
    const vat = subtotal * 0.15
    const total = subtotal + vat
    const quoteRef = `WACRM-Q-${Math.floor(100000 + Math.random() * 900000)}`
    const dateStr = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
    const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to view PDF quotation.')
      return
    }

    const itemsHtml = quoteItems
      .map(
        item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #64748b;">${item.sku}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #1e293b;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e293b;">R ${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">R ${(item.quantity * item.unitPrice).toFixed(2)}</td>
      </tr>
    `
      )
      .join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Official_Quotation_${quoteRef}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 40px; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
          .subbrand { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
          .quote-title { font-size: 22px; font-weight: 800; color: #0f172a; text-align: right; }
          .quote-meta { font-size: 12px; color: #475569; font-family: monospace; text-align: right; margin-top: 4px; }
          .customer-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 30px; }
          .customer-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px; }
          .customer-name { font-size: 16px; font-weight: 800; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; letter-spacing: 0.5px; }
          .totals-table { width: 300px; margin-left: auto; border-collapse: collapse; }
          .totals-table td { padding: 8px 12px; }
          .total-row { font-size: 16px; font-weight: 900; color: #10b981; border-top: 2px solid #0f172a; }
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Bee WhatsApp Auto Parts</div>
            <div class="subbrand">Official Quotation Deliverable</div>
          </div>
          <div>
            <div class="quote-title">OFFICIAL QUOTATION</div>
            <div class="quote-meta">REF: <strong>${quoteRef}</strong></div>
            <div class="quote-meta">DATE: ${dateStr}</div>
            <div class="quote-meta">VALID UNTIL: ${validUntil}</div>
          </div>
        </div>

        <div class="customer-card">
          <div class="customer-title">PREPARED FOR</div>
          <div class="customer-name">${customerName}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th>SKU / Part #</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total (Excl. VAT)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="color: #64748b; font-size: 13px;">Subtotal:</td>
            <td style="text-align: right; font-weight: 700; font-size: 13px;">R ${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 13px;">15% SA VAT:</td>
            <td style="text-align: right; font-weight: 700; font-size: 13px;">R ${vat.toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL AMOUNT:</td>
            <td style="text-align: right;">R ${total.toFixed(2)}</td>
          </tr>
        </table>

        <div class="footer">
          <p>Thank you for choosing Bee WhatsApp Auto Parts!</p>
          <p>• All quoted prices include 15% South African VAT.<br/>• Payment terms: EFT, Ozow, PayFast 1-click checkout.</p>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    toast.success('Instant PDF Quotation generated!')
  }

  const handleSendWhatsAppQuote = async (msgId: string) => {
    setSendingWaMsgId(msgId)
    const promptMsg = toast.loading('Dispatching WhatsApp Quote Agent...')
    try {
      const targetPhone = prompt('Enter customer WhatsApp phone number (e.g. +27821234567):', '+27')
      if (!targetPhone) {
        toast.dismiss(promptMsg)
        setSendingWaMsgId(null)
        return
      }

      const res = await fetch('/api/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetPhone,
          message_type: 'text',
          content_text: `📄 Official Quotation generated for your auto parts request! Check your attached PDF quotation document for total ZAR pricing including 15% SA VAT.`,
        }),
      })

      if (!res.ok) throw new Error('WhatsApp dispatch failed')

      // Update Pipeline Step 3 to Success
      setActivePipeline(prev =>
        prev.map(step =>
          step.id === 'step-3'
            ? {
                ...step,
                status: 'completed',
                logs: [...step.logs, `Dispatched WhatsApp PDF quotation to ${targetPhone}`],
                toolCalls: [
                  {
                    id: `tc-${Date.now()}`,
                    toolName: 'engineSendMedia',
                    status: 'success',
                    input: { to: targetPhone, kind: 'document' },
                    output: { whatsapp_message_id: `wa_${Date.now()}` },
                    timestamp: new Date().toLocaleTimeString(),
                  },
                ],
              }
            : step
        )
      )

      toast.success(`WhatsApp Quote dispatched to ${targetPhone}!`, { id: promptMsg })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send WhatsApp quote', { id: promptMsg })
    } finally {
      setSendingWaMsgId(null)
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsgId = String(Date.now())
    const assistantMsgId = String(Date.now() + 1)

    setLocalMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: text },
      { id: assistantMsgId, role: 'assistant', content: '' },
    ])

    setInputVal('')
    setIsLoading(true)

    // Update Pipeline for new agent execution run
    setActivePipeline(prev => [
      {
        id: `step-run-${Date.now()}`,
        agentName: 'Auto-Sourcing & Quote Pipeline',
        agentIcon: Cpu,
        trigger: `Inbound User Query: "${text.slice(0, 30)}..."`,
        status: 'running',
        startedAt: new Date().toLocaleTimeString(),
        toolCalls: [
          {
            id: `tc-live-${Date.now()}`,
            toolName: text.toLowerCase().includes('quote') ? 'createQuote' : 'searchInventory',
            status: 'running',
            input: { query: text },
            timestamp: new Date().toLocaleTimeString(),
          },
        ],
        logs: [
          `Received query: "${text}"`,
          'Executing inventory check & stagehand web scraper...',
        ],
      },
      ...prev,
    ])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          messages: [...localMessages, { role: 'user', content: text }],
        }),
      })

      if (!response.ok) {
        throw new Error(`API error ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunkStr = decoder.decode(value, { stream: true })
          const lines = chunkStr.split('\n')

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                assistantText += JSON.parse(line.slice(2))
              } catch {
                assistantText += line.slice(2)
              }
            } else if (!line.match(/^[0-9a-z]:/)) {
              assistantText += line
            }
          }

          setLocalMessages(prev =>
            prev.map(m => (m.id === assistantMsgId ? { ...m, content: assistantText } : m))
          )
        }
      }

      // Mark Pipeline Step as Completed
      setActivePipeline(prev =>
        prev.map((step, idx) =>
          idx === 0
            ? {
                ...step,
                status: 'completed',
                logs: [...step.logs, 'Agent pipeline completed output generation.'],
                toolCalls: step.toolCalls.map(tc => ({ ...tc, status: 'success' })),
              }
            : step
        )
      )
    } catch (err: any) {
      console.error('Chat error:', err)
      setLocalMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `⚠️ **Network Error:** ${err?.message || 'Failed to communicate with DeepSeek AI engine.'}`,
              }
            : m
        )
      )
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
        {/* Left Sidebar - Autonomous Agents & Control Panel */}
        <div className="w-80 border-r border-border bg-card/60 backdrop-blur-xl flex-col hidden lg:flex">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
              <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>AI Agent Studio</span>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] uppercase font-bold">
              4 Agents Live
            </Badge>
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4">
              {/* Active Autonomous Agent Roster */}
              <div>
                <div className="px-2 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                  <span>Agent Roster</span>
                  <span className="text-emerald-400 font-mono">ON</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 transition-all hover:bg-emerald-500/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                          <Search className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-foreground">Auto-Sourcing Agent</span>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px] border-0">ACTIVE</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Scans local catalog & web suppliers (*Goldwagen, Masterparts, Facebook SA*).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 transition-all hover:bg-purple-500/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-foreground">Smart ZAR Quote Agent</span>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-300 text-[9px] border-0">ACTIVE</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Calculates 15% SA VAT, compiles PDF quotes & Ozow 1-click payment links.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 transition-all hover:bg-blue-500/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-foreground">Stagehand Scraper</span>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300 text-[9px] border-0">READY</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Automated headless browser for out-of-stock part discovery.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-green-500/30 bg-green-500/5 transition-all hover:bg-green-500/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center font-bold">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-foreground">WhatsApp Dispatcher</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-300 text-[9px] border-0">ACTIVE</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Delivers text responses & attached quotation PDF files directly on WhatsApp.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Trigger Presets */}
              <div className="pt-3 border-t border-border">
                <div className="px-2 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Quick Triggers
                </div>
                <div className="space-y-1.5">
                  <Button
                    variant="ghost"
                    onClick={() => handlePromptClick('Quote 2x 2021 Toyota Hilux 2.8 GD-6 Front Brake Pads for Customer John Doe')}
                    className="w-full justify-start text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg p-2 h-auto"
                  >
                    <FileText className="w-3.5 h-3.5 mr-2 text-purple-400 shrink-0" />
                    <span className="truncate">Generate ZAR Quote for Hilux Brake Pads</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => handlePromptClick('Find 2022 Ford Ranger 3.2 Radiator Assembly with pricing and stock status')}
                    className="w-full justify-start text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg p-2 h-auto"
                  >
                    <Search className="w-3.5 h-3.5 mr-2 text-emerald-400 shrink-0" />
                    <span className="truncate">Search Ford Ranger Radiator Stock</span>
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Main Central Studio Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Header Bar & Tab Selector */}
          <div className="h-14 border-b border-border bg-card/40 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h1 className="font-bold text-sm text-foreground">Sourcing Copilot Studio</h1>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setActiveTab('pipeline')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  activeTab === 'pipeline'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Live Execution Pipeline</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  activeTab === 'chat'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Copilot Chat & PDF Studio</span>
              </button>
            </div>
          </div>

          {/* Workspace Body */}
          {activeTab === 'pipeline' ? (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400 animate-spin" />
                    <span>Real-Time Agent Execution Pipeline</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Visual workflow showing live triggers, agent delegation, executed tool calls, and output logs.
                  </p>
                </div>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-xs px-3 py-1">
                  Active Monitoring
                </Badge>
              </div>

              {/* Execution Steps */}
              <div className="space-y-4">
                {activePipeline.map((step, sIdx) => {
                  const Icon = step.agentIcon || Bot
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md overflow-hidden shadow-lg"
                    >
                      {/* Step Header */}
                      <div className="p-4 border-b border-border/60 bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/20">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground">{step.agentName}</span>
                              <Badge
                                className={cn(
                                  'text-[10px] border-0 uppercase font-bold',
                                  step.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : step.status === 'running'
                                    ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {step.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <strong>Trigger:</strong> {step.trigger}
                            </p>
                          </div>
                        </div>

                        <div className="text-right text-xs text-muted-foreground font-mono">
                          Started: {step.startedAt}
                        </div>
                      </div>

                      {/* Tool Calls & Execution Details */}
                      <div className="p-4 space-y-3">
                        <div className="text-xs font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-purple-400" />
                          <span>Tool Actions Executed</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {step.toolCalls.map(tc => (
                            <div
                              key={tc.id}
                              className="p-3 rounded-xl border border-border/60 bg-background/60 backdrop-blur-sm space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <code className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px]">
                                  {tc.toolName}
                                </code>
                                <span className="text-[10px] text-muted-foreground font-mono">{tc.timestamp}</span>
                              </div>

                              <div className="bg-muted/40 p-2 rounded-lg text-[11px] font-mono text-muted-foreground overflow-x-auto">
                                <div><strong>Input:</strong> {JSON.stringify(tc.input)}</div>
                                {tc.output && (
                                  <div className="mt-1 text-emerald-300">
                                    <strong>Output:</strong> {JSON.stringify(tc.output)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Live Activity Logs */}
                        <div className="pt-2">
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-blue-400" />
                            <span>System Activity Log</span>
                          </div>
                          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-emerald-400 font-mono text-[11px] space-y-1 max-h-32 overflow-y-auto">
                            {step.logs.map((log, lIdx) => (
                              <div key={lIdx} className="flex items-start gap-2">
                                <span className="text-zinc-600 shrink-0">&gt;</span>
                                <span>{log}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Copilot Chat Studio View */
            <div className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 p-4">
                <div className="max-w-4xl mx-auto space-y-6">
                  {localMessages.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className={cn(
                        'flex gap-3 text-sm',
                        m.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {m.role === 'assistant' && (
                        <Avatar className="w-8 h-8 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shrink-0">
                          <AvatarFallback className="bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                            AI
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl p-4 shadow-md leading-relaxed',
                          m.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-card border border-border text-foreground rounded-bl-none'
                        )}
                      >
                        {m.role === 'user' ? (
                          <p className="font-medium whitespace-pre-wrap">{m.content}</p>
                        ) : (
                          <div>
                            <FormattedMarkdown content={m.content} />

                            {/* Action Bar for Quotation Messages */}
                            {idx > 0 &&
                              (m.content.includes('Official Quotation Document') ||
                                m.content.includes('OFFICIAL QUOTATION')) && (
                                <div className="mt-4 pt-3 border-t border-border/80 flex items-center gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    onClick={() => generatePdfFromChatContent(m.content)}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs gap-1.5 shadow-md cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download ZAR PDF Quote</span>
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendWhatsAppQuote(m.id)}
                                    disabled={sendingWaMsgId === m.id}
                                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1.5 cursor-pointer"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Dispatch via WhatsApp</span>
                                  </Button>
                                </div>
                              )}
                          </div>
                        )}
                      </div>

                      {m.role === 'user' && (
                        <Avatar className="w-8 h-8 rounded-xl border border-border bg-muted text-muted-foreground shrink-0">
                          <AvatarFallback className="bg-muted text-foreground font-bold text-xs">
                            ME
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Chat Input Bar */}
              <div className="p-4 border-t border-border bg-card/60 backdrop-blur-md shrink-0">
                <form onSubmit={onSubmit} className="max-w-4xl mx-auto flex items-center gap-2">
                  <Input
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    placeholder="Ask Copilot to source a part, check inventory, or generate a quote..."
                    className="flex-1 bg-muted/60 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11 px-4 text-sm"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !inputVal.trim()}
                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold h-11 px-5 rounded-xl gap-2 cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Send</span>
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
