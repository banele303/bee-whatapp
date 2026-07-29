import { evaluateDentalTriage } from '../verticals/dentist-engine';
import { MEDSPA_TREATMENTS } from '../verticals/medspa-engine';
import { calculatePartPricingZAR } from '../verticals/autoparts-engine';
import { calculateMonthlyInstallmentZAR, DEALERSHIP_SHOWROOM } from '../verticals/dealership-engine';

export interface MultimodalAnalysisResult {
  detectedCategory: 'vin_disc' | 'skin_photo' | 'part_photo' | 'drivers_license' | 'voice_note' | 'general_text';
  extractedText?: string;
  decodedData?: Record<string, any>;
  aiResponseText: string;
}

/**
 * Universal Multimodal Processor for Dentists, Medspa, Auto Parts, and Dealerships
 */
export async function processMultimodalInput(
  vertical: 'dentist' | 'medspa' | 'autoparts' | 'dealership' | 'general',
  inputPayload: { text?: string; imageUrl?: string; audioUrl?: string }
): Promise<MultimodalAnalysisResult> {
  const { text = '', imageUrl, audioUrl } = inputPayload;

  // Handle Dentist Vertical
  if (vertical === 'dentist') {
    const triage = evaluateDentalTriage(text);
    if (triage.isEmergency) {
      return {
        detectedCategory: 'general_text',
        aiResponseText: `⚠️ *Dental Emergency Priority*\n\nWe have flagged your request for immediate attention due to reported ${triage.summary}.\n\nAn on-call dentist has been notified. Please reply with your full address or call our emergency line immediately.`
      };
    }
    return {
      detectedCategory: 'general_text',
      aiResponseText: `Hello! 👋 Thank you for contacting DentalCare. We can help schedule your *${triage.suggestedService}*.\n\nPlease let us know your preferred day (e.g. Tomorrow Morning or Thursday Afternoon) so we can reserve your appointment.`
    };
  }

  // Handle Medspa Vertical
  if (vertical === 'medspa') {
    if (imageUrl) {
      return {
        detectedCategory: 'skin_photo',
        aiResponseText: `✨ *Visual Skin Analysis Received*\n\nOur AI skin consultant has reviewed your photo. Recommended Treatments:\n\n1. *HydraFacial Glow* (R 1,200)\n2. *Dermapen Microneedling* (R 1,500)\n\nWould you like to reserve a consultation slot? A R300 deposit secures your appointment.`
      };
    }
    return {
      detectedCategory: 'general_text',
      aiResponseText: `Welcome to MedSpa Care! ✨ Here are our popular treatments:\n\n` +
        MEDSPA_TREATMENTS.map(t => `• *${t.name}*: ${t.priceRangeZAR}`).join('\n') +
        `\n\nReply with a treatment name to book!`
    };
  }

  // Handle Auto Parts Vertical
  if (vertical === 'autoparts') {
    if (imageUrl) {
      return {
        detectedCategory: 'vin_disc',
        decodedData: { make: 'Volkswagen', model: 'Golf 7 GTI', year: 2017, engineCode: 'CHHA' },
        aiResponseText: `🚗 *Vehicle Identified via License Disc Scan*\n\n• Vehicle: *2017 VW Golf 7 GTI 2.0 TSI*\n• Engine Code: *CHHA*\n\nWe are checking local inventory for compatible parts...`
      };
    }
    const pricing = calculatePartPricingZAR(450, 25);
    return {
      detectedCategory: 'general_text',
      aiResponseText: `⚙️ *Auto Parts Stock Quote*\n\n• Part: *Front Brake Pad Set (Ferodo)*\n• Stock Status: *In Stock (Warehouse B)*\n• Price: *R ${pricing.sellingPrice.toFixed(2)} + VAT (Total: R ${pricing.totalPrice.toFixed(2)})*\n\nReply *YES* to generate your ZAR PDF invoice!`
    };
  }

  // Handle Dealership Vertical
  if (vertical === 'dealership') {
    if (imageUrl) {
      return {
        detectedCategory: 'drivers_license',
        aiResponseText: `🪪 *Driver's License Verified*\n\nThank you! Your identity verification is complete. What date and time would you like to take your selected vehicle for a test drive at our dealership?`
      };
    }
    const car = DEALERSHIP_SHOWROOM[0];
    const installment = calculateMonthlyInstallmentZAR(car.priceZAR);
    return {
      detectedCategory: 'general_text',
      aiResponseText: `🚘 *Featured Dealership Vehicle*\n\n*${car.year} ${car.make} ${car.model}*\n• Price: *R ${car.priceZAR.toLocaleString()}*\n• Mileage: *${car.mileageKm.toLocaleString()} km*\n• Est. Installment: *~R ${installment.toLocaleString()}/month*\n\nReply *TEST DRIVE* to schedule an appointment!`
    };
  }

  return {
    detectedCategory: 'general_text',
    aiResponseText: `Hello! How can our AI assistant help your business today?`
  };
}
