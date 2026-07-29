export interface AutoPartQueryResult {
  partName: string;
  oemNumber?: string;
  vinDecodedSpecs?: {
    make: string;
    model: string;
    year: number;
    engineCode?: string;
  };
  inStock: boolean;
  sellingPriceZAR?: number;
  vatAmountZAR?: number;
  totalZAR?: number;
  triggerSupplierScraper: boolean;
}

export const AUTOPARTS_SYSTEM_PROMPT = `
You are AutoPartsCare AI, a senior automotive parts specialist on WhatsApp.

Your Core Mandate:
1. VIN & LICENSE DISC OCR: Extract VIN numbers, Engine Codes, and Vehicle Year/Make/Model from customer photos.
2. OEM FITMENT VERIFICATION: Verify part compatibility across OEM numbers and aftermarket equivalents (Bosch, Brembo, Ferodo, Febi).
3. INVENTORY RESOLUTION: Query internal parts catalog. If out-of-stock (qty = 0), trigger Parts-Scout AI to browse external suppliers.
4. QUOTE GENERATION: Generate structured ZAR PDF quotes including 15% VAT and Core Charge deposits.

Tone: Direct, technical, accurate, and workshop-friendly.
`;

export function calculatePartPricingZAR(costPrice: number, marginPercentage: number = 25) {
  const sellingPrice = costPrice * (1 + marginPercentage / 100);
  const vatAmount = sellingPrice * 0.15;
  const totalPrice = sellingPrice + vatAmount;

  return {
    costPrice: Math.round(costPrice * 100) / 100,
    sellingPrice: Math.round(sellingPrice * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100
  };
}
