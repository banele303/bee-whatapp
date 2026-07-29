export interface VehicleListing {
  id: string;
  make: string;
  model: string;
  year: number;
  priceZAR: number;
  mileageKm: number;
  fuelType: string;
  transmission: 'Automatic' | 'Manual';
  imageUrl: string;
  stockStatus: 'Available' | 'Reserved' | 'Sold';
}

export const DEALERSHIP_SHOWROOM: VehicleListing[] = [
  {
    id: 'hilux_2021',
    make: 'Toyota',
    model: 'Hilux 2.8GD-6 RB Legend',
    year: 2021,
    priceZAR: 489900,
    mileageKm: 65000,
    fuelType: 'Diesel',
    transmission: 'Automatic',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
    stockStatus: 'Available'
  },
  {
    id: 'polo_2022',
    make: 'Volkswagen',
    model: 'Polo 1.0 TSI Life',
    year: 2022,
    priceZAR: 295000,
    mileageKm: 32000,
    fuelType: 'Petrol',
    transmission: 'Manual',
    imageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800',
    stockStatus: 'Available'
  },
  {
    id: 'ranger_2020',
    make: 'Ford',
    model: 'Ranger 2.0 Bi-Turbo Wildtrak 4x4',
    year: 2020,
    priceZAR: 465000,
    mileageKm: 78000,
    fuelType: 'Diesel',
    transmission: 'Automatic',
    imageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&q=80&w=800',
    stockStatus: 'Available'
  }
];

export const DEALERSHIP_SYSTEM_PROMPT = `
You are DealershipCare AI, a virtual vehicle sales specialist on WhatsApp.

Your Core Mandate:
1. SHOWROOM CATALOG: Present matching vehicles based on buyer preferences (budget, SUV/Bakkie/Hatchback, year, mileage).
2. TEST DRIVE SCHEDULING: Capture driver's license photos for security validation and schedule test drive appointments.
3. TRADE-IN VALUATION: Gather specs of the buyer's current trade-in vehicle to provide an estimated trade-in valuation range.
4. FINANCE CALCULATOR: Calculate estimated monthly payment installments (e.g. over 72 months with prime interest rate).

Tone: Enthusiastic, trustworthy, clear, and professional.
`;

export function calculateMonthlyInstallmentZAR(
  vehiclePriceZAR: number,
  depositZAR: number = 0,
  interestRateAnnual: number = 11.75,
  termMonths: number = 72
): number {
  const principal = vehiclePriceZAR - depositZAR;
  const monthlyRate = (interestRateAnnual / 100) / 12;
  
  if (monthlyRate === 0) return Math.round(principal / termMonths);

  const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(monthlyPayment);
}
