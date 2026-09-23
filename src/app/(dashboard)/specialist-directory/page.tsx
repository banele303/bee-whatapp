'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, BookUser, Phone, Mail, Edit2, Trash2, Loader2, X } from 'lucide-react'

interface Specialist {
  id: string
  name: string
  specialty: string
  clinic_name: string | null
  phone: string | null
  email: string | null
  whatsapp_number: string | null
  address: string | null
  notes: string | null
  is_active: boolean
}

const SPECIALTIES = [
  'Cardiologist', 'Dermatologist', 'Orthopedic Surgeon', 'Ophthalmologist',
  'Psychiatrist', 'Nephrologist', 'Urologist', 'Gastroenterologist',
  'Endocrinologist', 'Pulmonologist', 'Neurologist', 'Dental Specialist',
  'Aesthetic Physician', 'Oncologist', 'Paediatrician', 'Gynaecologist',
  'Radiologist', 'General Surgeon', 'ENT Specialist', 'Physiotherapist',
]

export default function SpecialistDirectoryPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', specialty: '', clinic_name: '', phone: '', email: '',
    whatsapp_number: '', address: '', notes: '',
  })

  const fetchSpecialists = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/healthcare/specialist-directory')
      const data = await res.json()
      setSpecialists(data.specialists ?? [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchSpecialists() }, [])

  const openCreate = () => {
    setForm({ name: '', specialty: '', clinic_name: '', phone: '', email: '', whatsapp_number: '', address: '', notes: '' })
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (s: Specialist) => {
    setForm({
      name: s.name, specialty: s.specialty, clinic_name: s.clinic_name ?? '',
      phone: s.phone ?? '', email: s.email ?? '', whatsapp_number: s.whatsapp_number ?? '',
      address: s.address ?? '', notes: s.notes ?? '',
    })
    setEditingId(s.id)
    setShowModal(true)
  }

  const saveSpecialist = async () => {
    if (!form.name || !form.specialty) return
    setIsSaving(true)
    try {
      if (editingId) {
        await fetch('/api/healthcare/specialist-directory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...form }),
        })
      } else {
        await fetch('/api/healthcare/specialist-directory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setShowModal(false)
      fetchSpecialists()
    } finally {
      setIsSaving(false)
    }
  }

  const deleteSpecialist = async (id: string) => {
    if (!confirm('Remove this specialist from the directory?')) return
    await fetch(`/api/healthcare/specialist-directory?id=${id}`, { method: 'DELETE' })
    fetchSpecialists()
  }

  const filtered = specialists.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.specialty.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 sticky top-0 z-30 bg-slate-950/95 backdrop-blur px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookUser className="w-6 h-6 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold">Specialist Directory</h1>
              <p className="text-xs text-slate-500">Referral contacts for your clinic</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" /> Add Specialist
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or specialty…"
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 placeholder:text-slate-600 outline-none focus:border-indigo-500"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <BookUser className="w-14 h-14 text-slate-700 mx-auto" />
            <p className="text-slate-500 text-sm">
              {search ? 'No specialists match your search.' : 'No specialists yet. Add your referral contacts.'}
            </p>
            {!search && (
              <button onClick={openCreate} className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold">
                Add First Specialist
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white">{s.name}</h3>
                    <span className="text-xs text-indigo-400 font-medium">{s.specialty}</span>
                    {s.clinic_name && <p className="text-xs text-slate-400 mt-0.5">{s.clinic_name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(s)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-white transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteSpecialist(s.id)} className="p-2 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {s.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-600" /> {s.phone}
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-600" /> {s.email}
                    </div>
                  )}
                </div>
                {s.notes && <p className="text-xs text-slate-500 border-t border-slate-800 pt-2">{s.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Specialist' : 'Add Specialist'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Dr. Jane Smith"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Specialty *</label>
                  <select
                    value={form.specialty}
                    onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                  >
                    <option value="">Select…</option>
                    {SPECIALTIES.map((sp) => <option key={sp} value={sp}>{sp}</option>)}
                  </select>
                </div>
              </div>

              {[
                { key: 'clinic_name', label: 'Clinic / Practice Name', placeholder: 'City Medical Centre' },
                { key: 'phone', label: 'Phone', placeholder: '+27 11 000 0000' },
                { key: 'email', label: 'Email', placeholder: 'doctor@clinic.co.za' },
                { key: 'whatsapp_number', label: 'WhatsApp Number', placeholder: '+27 82 000 0000' },
                { key: 'address', label: 'Address', placeholder: '123 Main St, Sandton, Johannesburg' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">{label}</label>
                  <input
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
              ))}

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Referral notes, payment info, etc."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold">
                Cancel
              </button>
              <button
                onClick={saveSpecialist}
                disabled={isSaving || !form.name || !form.specialty}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingId ? 'Update' : 'Add Specialist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
