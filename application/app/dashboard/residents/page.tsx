'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { Resident, Bed } from '@/lib/types'

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [availableBeds, setAvailableBeds] = useState<Bed[]>([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedBedId, setSelectedBedId] = useState('')

  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    const [residentsRes, bedsRes] = await Promise.all([
      supabase.from('residents').select('*').order('created_at', { ascending: false }),
      supabase.from('beds').select('*').eq('status', 'available'),
    ])

    if (residentsRes.data) setResidents(residentsRes.data)
    if (bedsRes.data) setAvailableBeds(bedsRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRegisterResident = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Create Resident
    const { data: resident, error: residentError } = await supabase
      .from('residents')
      .insert({
        full_name: fullName,
        phone,
        joining_date: new Date().toISOString().split('T')[0],
        status: 'active',
      })
      .select()
      .single()

    if (residentError) {
      alert(residentError.message)
      return
    }

    // 2. Assign Bed if selected
    if (selectedBedId) {
      const { error: bedError } = await supabase
        .from('beds')
        .update({
          status: 'occupied',
          resident_id: resident.id,
        })
        .eq('id', selectedBedId)

      if (bedError) alert(bedError.message)
    }

    setFullName('')
    setPhone('')
    setSelectedBedId('')
    fetchData()
  }

  const handleCheckout = async (residentId: string) => {
    // 1. Update Resident Status
    await supabase
      .from('residents')
      .update({
        status: 'checked_out',
        checkout_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', residentId)

    // 2. Clear assigned bed
    await supabase
      .from('beds')
      .update({ status: 'available', resident_id: null })
      .eq('resident_id', residentId)

    fetchData()
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Resident Directory</h1>

        {/* Add Resident Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold mb-4">Register New Resident</h2>
          <form onSubmit={handleRegisterResident} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                required
                className="mt-1 w-full border px-3 py-2 rounded-md"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="text"
                className="mt-1 w-full border px-3 py-2 rounded-md"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign Bed</label>
              <select
                className="mt-1 w-full border px-3 py-2 rounded-md bg-white"
                value={selectedBedId}
                onChange={(e) => setSelectedBedId(e.target.value)}
              >
                <option value="">-- Select Bed --</option>
                {availableBeds.map((bed) => (
                  <option key={bed.id} value={bed.id}>
                    Bed {bed.bed_number}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Register & Assign
            </button>
          </form>
        </div>

        {/* Resident Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading residents...</div>
          ) : residents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No residents registered yet.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-sm font-semibold text-gray-600">Name</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Phone</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Joining Date</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {residents.map((resident) => (
                  <tr key={resident.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">{resident.full_name}</td>
                    <td className="p-4 text-gray-600">{resident.phone || 'N/A'}</td>
                    <td className="p-4 text-gray-600">{resident.joining_date}</td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-1 rounded font-semibold ${
                          resident.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {resident.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {resident.status === 'active' && (
                        <button
                          onClick={() => handleCheckout(resident.id)}
                          className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}