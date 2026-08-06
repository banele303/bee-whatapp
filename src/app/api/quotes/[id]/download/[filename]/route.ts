import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ai/admin-client'
import PDFDocument from 'pdfkit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { id } = await params
    const db = supabaseAdmin()

    const { data: quote, error } = await db
      .from('quotes_and_invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !quote) {
      return new NextResponse('Quotation not found', { status: 404 })
    }

    const { data: account } = await db
      .from('accounts')
      .select('name')
      .eq('id', quote.account_id)
      .maybeSingle()

    const businessName = account?.name || 'Bee WhatsApp Auto Parts'
    const createdDate = new Date(quote.created_at).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
    })

    doc.fontSize(22).font('Helvetica-Bold').text(businessName, { align: 'right' })
    doc.fontSize(10).font('Helvetica').fillColor('gray').text('Premium Auto Parts & Accessories • South Africa', { align: 'right' })
    doc.moveDown(2)
    
    doc.fontSize(16).fillColor('black').text(`OFFICIAL QUOTATION: ${quote.quote_number}`)
    doc.fontSize(11).text(`Date: ${createdDate}`)
    doc.text(`Customer: ${quote.customer_name || 'Valued Customer'}`)
    if (quote.phone_number) {
      doc.text(`Phone: ${quote.phone_number}`)
    }
    doc.moveDown(2)

    const tableTop = doc.y
    doc.font('Helvetica-Bold').fontSize(10)
    doc.text('Item Description', 50, tableTop)
    doc.text('SKU', 250, tableTop)
    doc.text('Qty', 340, tableTop)
    doc.text('Unit Price', 390, tableTop, { width: 80, align: 'right' })
    doc.text('Total', 480, tableTop, { width: 70, align: 'right' })
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke()
    
    let y = tableTop + 25
    doc.font('Helvetica').fontSize(10)

    for (const item of (quote.items || [])) {
      const desc = item.description || item.name || 'Auto Part'
      const sku = item.sku || 'N/A'
      const qty = (item.quantity || 1).toString()
      const unitPrice = `R ${Number(item.unitPrice || item.price || 0).toFixed(2)}`
      const lineTotal = `R ${(Number(item.quantity || 1) * Number(item.unitPrice || item.price || 0)).toFixed(2)}`

      doc.text(desc, 50, y, { width: 190 })
      doc.text(sku, 250, y)
      doc.text(qty, 340, y)
      doc.text(unitPrice, 390, y, { width: 80, align: 'right' })
      doc.text(lineTotal, 480, y, { width: 70, align: 'right' })
      
      y += 22
      if (y > 700) {
        doc.addPage()
        y = 50
      }
    }

    doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke()
    y += 20

    doc.font('Helvetica-Bold')
    doc.text('Subtotal:', 380, y, { width: 90, align: 'right' })
    doc.text(`R ${Number(quote.subtotal || 0).toFixed(2)}`, 480, y, { width: 70, align: 'right' })
    y += 18
    
    doc.text('VAT (15%):', 380, y, { width: 90, align: 'right' })
    doc.text(`R ${Number(quote.vat_amount || 0).toFixed(2)}`, 480, y, { width: 70, align: 'right' })
    y += 18

    doc.fontSize(12)
    doc.text('Total:', 380, y, { width: 90, align: 'right' })
    doc.text(`R ${Number(quote.total_amount || 0).toFixed(2)}`, 480, y, { width: 70, align: 'right' })
    
    doc.moveDown(3)
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('gray').text('Thank you for your business! This quotation is valid for 14 days.', 50, doc.y, { align: 'center' })

    doc.end()
    
    const pdfBuffer = await pdfPromise

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="Quotation-${quote.quote_number}.pdf"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err: any) {
    console.error('PDF Generation Error:', err)
    return new NextResponse(`Error generating PDF: ${err.message}`, { status: 500 })
  }
}
