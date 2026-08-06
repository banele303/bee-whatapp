import { tool } from 'ai'
import { z } from 'zod'

const params = z.object({
  customerName: z.string().describe('Customer full name'),
  serviceType: z.string().describe('Type of service (e.g., Brake Replacement, Oil Service, Part Pickup)'),
  preferredDate: z.string().describe('Preferred date and time (e.g., 2026-08-10 10:00 AM)'),
  notes: z.string().optional().describe('Additional notes or vehicle details'),
})

export const bookAppointment = tool({
  description: 'Book a service appointment, part installation, or pickup slot for a customer.',
  parameters: params,
  execute: async ({ customerName, serviceType, preferredDate, notes }: z.infer<typeof params>) => {
    const bookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`
    
    return {
      success: true,
      bookingId,
      customerName,
      serviceType,
      date: preferredDate,
      message: `Appointment *${bookingId}* confirmed for *${customerName}* on *${preferredDate}* (${serviceType}).`,
    }
  },
})
