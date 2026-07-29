'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  MessageSquare,
  Eye,
  Mic,
  Globe,
  Calendar,
  FileText,
  Stethoscope,
  Wrench,
  Car,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Layers
} from 'lucide-react';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'dentist' | 'medspa' | 'autoparts' | 'dealership'>('autoparts');

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 px-6 lg:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-black text-xl shadow-lg shadow-orange-500/20">
            W
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
            WACRM <span className="text-orange-500 font-medium text-sm ml-1 px-2 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10">AI SaaS</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#services" className="hover:text-white transition-colors">AI Services</a>
          <a href="#industries" className="hover:text-white transition-colors">Industries</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/onboarding"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-bold text-sm text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] flex items-center gap-2"
          >
            <span>Launch Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6 lg:px-12 max-w-7xl mx-auto text-center space-y-8 overflow-hidden">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          The Multi-Vertical AI & WhatsApp Operating System
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Automate Sales, Vision & Bookings with <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">Vertical AI Agents</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          Not just WhatsApp CRM — an all-in-one AI platform equipped with Multimodal Vision, Voice Note Transcription, Supplier Web Scout Agents, and Automated Quotes for Dentists, Medspas, Auto Parts & Car Dealerships.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/onboarding"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-base text-white shadow-xl shadow-orange-500/30 transition-all hover:scale-105 flex items-center justify-center gap-3"
          >
            <span>Select Your Industry & Start</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 font-semibold text-base text-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <span>Explore Dashboard Demo</span>
          </Link>
        </div>
      </section>

      {/* Complete AI Tools Showcase */}
      <section id="services" className="py-24 bg-slate-900/50 border-y border-slate-800/80 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Full Suite of AI Tools Built into One Platform
            </h2>
            <p className="text-slate-400 text-base">
              Everything your business needs to automate leads, inspect photos, scrape supplier prices, and collect instant payments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Tool 1 */}
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-orange-500/50 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">WhatsApp & Multi-Channel AI CRM</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Shared team inbox, broadcast campaigns, drag-and-drop flow builders, and automated AI responses with zero latency.
              </p>
            </div>

            {/* Tool 2 */}
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-purple-500/50 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Multimodal Vision & OCR AI</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Decodes VIN license disc photos, inspects medspa skin images, scans driver's licenses, and reads OEM part numbers.
              </p>
            </div>

            {/* Tool 3 */}
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-emerald-500/50 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Autonomous Web Scout Agent</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                When local inventory is zero, our Playwright web agent browses external supplier portals live to extract trade prices and ETAs.
              </p>
            </div>

            {/* Tool 4 */}
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-blue-500/50 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Smart Calendar & Appt Triage</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                24/7 dental emergency triage, medspa skin consultation slots, and dealership test drive scheduler.
              </p>
            </div>

            {/* Tool 5 */}
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-amber-500/50 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">1-Click PDF Quotes & Payments</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Auto-generates ZAR PDF quotes with 15% VAT, core deposit refunds, and PayFast/Ozow instant EFT checkout links.
              </p>
            </div>

            {/* Tool 6 */}
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-cyan-500/50 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Voice Note AI Transcriber</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Converts workshop audio voice notes and patient voice clips into structured, actionable JSON queries using Whisper.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vertical Solutions Tabbed Section */}
      <section id="industries" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Tailored AI Solutions for Your Specific Vertical
          </h2>
          <p className="text-slate-400 text-base">
            Select your industry to see the exact AI agent capabilities configured for your business out of the box.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setActiveTab('dentist')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'dentist' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Dentists & Clinics
          </button>
          <button
            onClick={() => setActiveTab('medspa')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'medspa' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Medspas & Aesthetics
          </button>
          <button
            onClick={() => setActiveTab('autoparts')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'autoparts' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Auto Car Parts
          </button>
          <button
            onClick={() => setActiveTab('dealership')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'dealership' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Car className="w-4 h-4" />
            Car Dealerships
          </button>
        </div>

        {/* Tab Content Cards */}
        <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/80 max-w-4xl mx-auto shadow-2xl space-y-6">
          {activeTab === 'dentist' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-blue-400 font-bold text-lg">
                <Stethoscope className="w-6 h-6" />
                DentalCare AI Receptionist & Triage Engine
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Automatically evaluates patient pain levels on WhatsApp, alerts on-call dentists for emergency tooth trauma, and schedules routine cleaning slots directly into your calendar.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 font-medium pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> 24/7 Emergency Dental Triage</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Google Calendar & PMS Booking</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> 6-Month Patient Checkup Recalls</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Post-Procedure Treatment Care</li>
              </ul>
            </div>
          )}

          {activeTab === 'medspa' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-purple-400 font-bold text-lg">
                <Sparkles className="w-6 h-6" />
                MedSpaCare AI Visual Skin Consultant & Deposit Booking
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Uses Gemini Vision to inspect client skin photos, recommend HydraFacial or Microneedling packages, and collect booking deposits via PayFast to eliminate no-shows.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 font-medium pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Gemini Vision Photo Skin Analysis</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500" /> 1-Click PayFast Deposit Links</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Interactive Treatment Catalog</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500" /> Post-Laser Day 1-7 Healing Checks</li>
              </ul>
            </div>
          )}

          {activeTab === 'autoparts' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-orange-400 font-bold text-lg">
                <Wrench className="w-6 h-6" />
                AutoPartsCare AI VIN Scanner & Parts-Scout Web Agent
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Decodes VIN license disc photos, queries OEM fitment catalogs, and launches a live Playwright web scraper to fetch prices from external supplier web portals when local stock is zero.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 font-medium pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> VIN License Disc Photo OCR</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Parts-Scout Supplier Web Scraper</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> ZAR PDF Quotes with 15% VAT</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Hollander Scrap Yard Code Matrix</li>
              </ul>
            </div>
          )}

          {activeTab === 'dealership' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-emerald-400 font-bold text-lg">
                <Car className="w-6 h-6" />
                DealershipCare AI Virtual Showroom & Test Drive Scheduler
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Displays a virtual WhatsApp vehicle showroom, scans driver's licenses for security verification, and calculates trade-in valuations and monthly financing installments.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 font-medium pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> WhatsApp Virtual Showroom</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Driver's License Security Scan</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant Trade-In Valuation AI</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Monthly Installment Calculator</li>
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-900/50 border-t border-slate-800/80 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Simple, Transparent ZAR Pricing
            </h2>
            <p className="text-slate-400 text-base">
              Pick the right tier for your clinic, workshop, or dealership with zero hidden setup fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/90 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Starter</h3>
                <p className="text-xs text-slate-400">Ideal for small clinics & single spares shops.</p>
                <div className="text-3xl font-extrabold text-white">
                  R 990 <span className="text-sm font-normal text-slate-400">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 pt-4">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> 1 WhatsApp Business Number</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> 500 AI Vision / OCR Scans</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Shared Team Inbox</li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="w-full py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-white font-semibold text-sm text-center block transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Pro (Featured) */}
            <div className="p-8 rounded-3xl border-2 border-orange-500 bg-gradient-to-b from-slate-900 to-slate-950 space-y-6 flex flex-col justify-between relative shadow-2xl shadow-orange-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-orange-500 text-white text-xs font-black uppercase tracking-wider">
                MOST POPULAR
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Pro SaaS</h3>
                <p className="text-xs text-slate-400">For growing practices, auto dealers & multi-agent teams.</p>
                <div className="text-3xl font-extrabold text-white">
                  R 2,490 <span className="text-sm font-normal text-slate-400">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 pt-4">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> 3 WhatsApp & Multi-Channel Numbers</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Autonomous Supplier Web Scout Agent</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> 2,500 AI Vision / OCR Scans</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> PayFast / Ozow 1-Click Payments</li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm text-center block transition-all shadow-lg shadow-orange-500/25"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/90 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Enterprise</h3>
                <p className="text-xs text-slate-400">For large dealership networks & hospital groups.</p>
                <div className="text-3xl font-extrabold text-white">
                  R 5,990 <span className="text-sm font-normal text-slate-400">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300 pt-4">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Unlimited WhatsApp Channels</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Custom Web Scraping Agents</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Dedicated Account Manager & SLA</li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="w-full py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-white font-semibold text-sm text-center block transition-colors"
              >
                Contact Enterprise Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-12 px-6 lg:px-12 text-center text-xs text-slate-500">
        <p>© 2026 WACRM AI SaaS Platform. Built for Dentists, Medspas, Auto Parts & Car Dealerships.</p>
      </footer>
    </div>
  );
}
