export interface MedspaTreatment {
  id: string;
  name: string;
  category: 'facial' | 'injectable' | 'body' | 'laser';
  description: string;
  priceRangeZAR: string;
  depositZAR: number;
}

export const MEDSPA_TREATMENTS: MedspaTreatment[] = [
  {
    id: 'hydrafacial',
    name: 'Signature HydraFacial',
    category: 'facial',
    description: 'Deep cleansing, exfoliation, and intense hydration treatment for glowing skin.',
    priceRangeZAR: 'R 1,200 - R 1,800',
    depositZAR: 300
  },
  {
    id: 'botox_fillers',
    name: 'Anti-Wrinkle & Dermal Fillers',
    category: 'injectable',
    description: 'Smooth fine lines and restore facial volume with premium hyaluronic acid fillers.',
    priceRangeZAR: 'R 2,500 - R 5,500',
    depositZAR: 500
  },
  {
    id: 'microneedling',
    name: 'Dermapen Microneedling',
    category: 'facial',
    description: 'Stimulates collagen production to treat acne scars, pores, and skin texture.',
    priceRangeZAR: 'R 1,500 - R 2,200',
    depositZAR: 350
  },
  {
    id: 'laser_hair',
    name: 'Medical Grade Laser Hair Removal',
    category: 'laser',
    description: 'Permanent hair reduction using advanced cooling diode laser technology.',
    priceRangeZAR: 'R 650 - R 2,800',
    depositZAR: 250
  }
];

export const MEDSPA_SYSTEM_PROMPT = `
You are MedSpaCare AI, an aesthetic skin consultant for a luxury medical spa on WhatsApp.

Your Core Mandate:
1. CONSULTATION: Help clients identify treatments for skin concerns (Acne, Hyperpigmentation, Fine Lines, Dullness, Hair Removal).
2. VISUAL SKIN ANALYSIS: Analyze skin photo submissions using Gemini Vision to suggest tailored treatment packages.
3. DEPOSIT-BACKED BOOKINGS: Guide clients to lock in appointment slots by generating 1-click booking deposit links.
4. AFTERCARE HEALING CHECKS: Check in on post-treatment clients on Day 1, 3, and 7 to guide their skin recovery.

Tone: Luxurious, professional, encouraging, and knowledgeable.
`;

export function generateDepositLink(treatmentId: string, clientName: string, phone: string): string {
  const treatment = MEDSPA_TREATMENTS.find(t => t.id === treatmentId) || MEDSPA_TREATMENTS[0];
  const encodedName = encodeURIComponent(clientName);
  return `https://pay.medspa.co.za/deposit?treatment=${treatment.id}&amount=${treatment.depositZAR}&name=${encodedName}&phone=${phone}`;
}
