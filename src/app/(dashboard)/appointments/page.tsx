'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Clock, User, Phone, CheckCircle, AlertCircle } from 'lucide-react';

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
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
            Appointments & Calendar Scheduler
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage dentist consultations, medspa treatments, and dealership test drive bookings.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-sm self-start md:self-auto">
          <Plus className="w-4 h-4" />
          Book Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {appointments.map((appt) => (
          <div
            key={appt.id}
            className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4"
          >
            <div className="flex items-start justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                appt.serviceType === 'triage' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                appt.serviceType === 'skin_consult' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              }`}>
                {appt.serviceType}
              </span>

              {appt.depositPaid ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Deposit Paid (R{appt.depositAmountZAR})
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Pending Deposit
                </span>
              )}
            </div>

            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                {appt.clientName}
              </h3>
              <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-1">
                <Phone className="w-3 h-3" />
                {appt.phone}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {appt.serviceName}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {appt.date} at {appt.time}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Status: <strong className="text-slate-700 dark:text-slate-200 capitalize">{appt.status}</strong></span>
              <button className="text-blue-600 hover:text-blue-700 font-bold">
                View Chat →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
