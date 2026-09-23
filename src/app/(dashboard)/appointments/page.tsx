'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, Plus, Clock, User, Phone, CheckCircle, AlertCircle, Stethoscope, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppointmentItem {
  id: string;
  clientName: string;
  phone: string;
  serviceName: string;
  serviceType: 'triage' | 'cleaning' | 'skin_consult' | 'laser' | 'test_drive';
  date: string;
  time: string;
  depositPaid: boolean;
  depositAmountZAR: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
}

const INITIAL_APPOINTMENTS: AppointmentItem[] = [
  {
    id: '1',
    clientName: 'Sarah Jenkins',
    phone: '+27 82 456 7890',
    serviceName: 'Emergency Dental Examination',
    serviceType: 'triage',
    date: '2026-07-29',
    time: '09:30 AM',
    depositPaid: true,
    depositAmountZAR: 300,
    status: 'confirmed'
  },
  {
    id: '2',
    clientName: 'Dr. Michael Ndlovu',
    phone: '+27 71 234 5678',
    serviceName: 'HydraFacial Skin Consultation',
    serviceType: 'skin_consult',
    date: '2026-07-29',
    time: '11:00 AM',
    depositPaid: true,
    depositAmountZAR: 350,
    status: 'confirmed'
  },
  {
    id: '3',
    clientName: 'Kevin Van Der Merwe',
    phone: '+27 83 987 6543',
    serviceName: 'Test Drive: 2021 Toyota Hilux 2.8',
    serviceType: 'test_drive',
    date: '2026-07-29',
    time: '02:15 PM',
    depositPaid: false,
    depositAmountZAR: 0,
    status: 'scheduled'
  }
];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>(INITIAL_APPOINTMENTS);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Appointments & Scheduler
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage dentist consultations, medspa treatments, and client bookings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/session" className="flex-1 sm:flex-none">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold gap-1.5 rounded-xl h-10"
            >
              <Stethoscope className="w-3.5 h-3.5 text-primary" />
              Live Session Cockpit
            </Button>
          </Link>

          <Button
            size="sm"
            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 rounded-xl h-10 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Appointment Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {appointments.map((appt) => (
          <div
            key={appt.id}
            className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  appt.serviceType === 'triage' ? 'bg-destructive/15 text-destructive border border-destructive/30' :
                  appt.serviceType === 'skin_consult' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                  'bg-primary/15 text-primary border border-primary/30'
                }`}>
                  {appt.serviceType.replace('_', ' ')}
                </span>

                {appt.depositPaid ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Deposit (R{appt.depositAmountZAR})
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Pending Deposit
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {appt.clientName}
                </h3>
                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3" />
                  {appt.phone}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                <div className="text-xs font-semibold text-foreground">
                  {appt.serviceName}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-primary" />
                  {appt.date} at {appt.time}
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between text-xs border-t border-border gap-2">
              <span className="text-muted-foreground">
                Status: <strong className="text-foreground capitalize">{appt.status}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Link
                  href={`/session?patient=${encodeURIComponent(appt.clientName)}&service=${encodeURIComponent(appt.serviceName)}&type=${encodeURIComponent(appt.serviceType === 'triage' ? 'triage' : appt.serviceType === 'skin_consult' ? 'treatment_plan' : 'consultation')}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs transition-all"
                >
                  <Stethoscope className="w-3 h-3" />
                  Start Session
                </Link>
                <Link
                  href="/inbox"
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="View Chat"
                >
                  <MessageSquare className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
