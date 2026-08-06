import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ai/admin-client'
import PDFDocument from 'pdfkit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 })
    
    // Collect PDF chunks
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    // Wait for the PDF to finish generating
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
    })

    // --- Header ---
    doc.fontSize(24).font('Helvetica-Bold').text(businessName, { align: 'right' })
    doc.fontSize(10).font('Helvetica').fillColor('gray').text('Premium Auto Parts & Accessories • South Africa', { align: 'right' })
    doc.moveDown(2)
    
    doc.fontSize(18).fillColor('black').text(`Quotation: ${quote.quote_number}`)
    doc.fontSize(12).text(`Date: ${createdDate}`)
    doc.text(`Customer: ${quote.customer_name || 'Valued Customer'}`)
    if (quote.phone_number) {
      doc.text(`Phone: ${quote.phone_number}`)
    }
    doc.moveDown(2)

    // --- Table Header ---
    const tableTop = doc.y
    doc.font('Helvetica-Bold').fontSize(10)
    doc.text('Item', 50, tableTop)
    doc.text('SKU', 250, tableTop)
    doc.text('Qty', 350, tableTop)
    doc.text('Unit Price', 400, tableTop, { width: 90, align: 'right' })
    doc.text('Total', 500, tableTop, { width: 60, align: 'right' })
    
    doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke()
    
    let y = tableTop + 25
    doc.font('Helvetica').fontSize(10)

    // --- Table Rows ---
    for (const item of (quote.items || [])) {
      const desc = item.description || item.name || 'Auto Part'
      const sku = item.sku || 'N/A'
      const qty = item.quantity.toString()
      const unitPrice = `R ${Number(item.unitPrice || item.price || 0).toFixed(2)}`
      const lineTotal = `R ${(Number(item.quantity) * Number(item.unitPrice || item.price || 0)).toFixed(2)}`

      doc.text(desc, 50, y, { width: 190 })
      doc.text(sku, 250, y)
      doc.text(qty, 350, y)
      doc.text(unitPrice, 400, y, { width: 90, align: 'right' })
      doc.text(lineTotal, 500, y, { width: 60, align: 'right' })
      
      y += 20
      
      // Add page break if we reach the bottom
      if (y > 700) {
        doc.addPage()
        y = 50
      }
    }

    doc.moveTo(50, y + 5).lineTo(560, y + 5).stroke()
    y += 20

    // --- Totals ---
    doc.font('Helvetica-Bold')
    doc.text('Subtotal:', 400, y, { width: 90, align: 'right' })
    doc.text(`R ${Number(quote.subtotal || 0).toFixed(2)}`, 500, y, { width: 60, align: 'right' })
    y += 20
    
    doc.text('VAT (15%):', 400, y, { width: 90, align: 'right' })
    doc.text(`R ${Number(quote.vat_amount || 0).toFixed(2)}`, 500, y, { width: 60, align: 'right' })
    y += 20

    doc.fontSize(12)
    doc.text('Total:', 400, y, { width: 90, align: 'right' })
    doc.text(`R ${Number(quote.total_amount || 0).toFixed(2)}`, 500, y, { width: 60, align: 'right' })
    
    doc.moveDown(4)
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('gray').text('Thank you for your business! Please let us know if you have any questions about this quote.', 50, doc.y, { align: 'center' })

    // Finalize the PDF
    doc.end()
    
    const pdfBuffer = await pdfPromise

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Quotation-${quote.quote_number}.pdf"`,
      },
    })
  } catch (err: any) {
    console.error('PDF Generation Error:', err)
    return new NextResponse(`Error generating PDF: ${err.message}`, { status: 500 })
  }
}
