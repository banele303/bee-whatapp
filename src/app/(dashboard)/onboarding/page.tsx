'use client';

import React, { useState } from 'react';
import { Stethoscope, Sparkles, Car, Wrench, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VerticalOption {
  id: 'dentist' | 'medspa' | 'autoparts' | 'dealership';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  features: string[];
  gradient: string;
}

const VERTICALS: VerticalOption[] = [
  {
    id: 'dentist',
    title: 'Dentist & Dental Clinic',
    subtitle: 'Emergency triage bot, appointment scheduler & 6-month patient recalls.',
    icon: <Stethoscope className="w-8 h-8 text-blue-500" />,
    features: ['24/7 AI Emergency Triage', 'Google Calendar / PMS Booking', 'Automated 6-Month Recalls'],
    gradient: 'from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800'
  },
  {
    id: 'medspa',
    title: 'Medspa & Aesthetics',
    subtitle: 'Visual skin AI consultation, treatment package quotes & deposit bookings.',
    icon: <Sparkles className="w-8 h-8 text-purple-500" />,
    features: ['Gemini Vision Skin Analysis', 'Deposit Payment Links (PayFast)', 'Post-Care Healing Check-ins'],
    gradient: 'from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800'
  },
  {
    id: 'autoparts',
    title: 'Auto Car Parts & Spares',
    subtitle: 'VIN/license disc OCR, fitment lookup & supplier web scout agent.',
    icon: <Wrench className="w-8 h-8 text-orange-500" />,
    features: ['VIN License Disc Photo OCR', 'Parts-Scout Supplier Web Scraper', 'ZAR PDF Quote & Core Tracker'],
    gradient: 'from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800'
  },
  {
    id: 'dealership',
    title: 'Car Dealership & Sales',
    subtitle: 'Virtual WhatsApp car showroom, driver license OCR & test drive scheduler.',
    icon: <Car className="w-8 h-8 text-emerald-500" />,
    features: ['WhatsApp Virtual Showroom', 'Driver License Security Scan', 'Trade-In & Finance Calculator'],
    gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800'
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectVertical = async (verticalId: string) => {
    setSelectedVertical(verticalId);
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to provision vertical workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full text-center space-y-4 mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Welcome to Your WhatsApp AI CRM
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
          Choose your business vertical below. We will instantly configure your AI Agents, pipelines, and WhatsApp bot templates for your industry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {VERTICALS.map((option) => {
          const isSelected = selectedVertical === option.id;
          return (
            <div
              key={option.id}
              onClick={() => !loading && handleSelectVertical(option.id)}
              className={`relative rounded-2xl border-2 p-6 transition-all duration-200 cursor-pointer bg-gradient-to-br ${option.gradient} ${
                isSelected ? 'ring-4 ring-slate-900 dark:ring-white scale-[1.02]' : 'hover:scale-[1.01] hover:shadow-lg'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xs">
                  {option.icon}
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-6 h-6 text-slate-900 dark:text-white" />
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {option.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                {option.subtitle}
              </p>

              <ul className="space-y-2 mb-6">
                {option.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white mr-2" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {loading && isSelected ? (
                  <span>Deploying AI Workspace...</span>
                ) : (
                  <>
                    <span>Select {option.title.split('&')[0]}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
