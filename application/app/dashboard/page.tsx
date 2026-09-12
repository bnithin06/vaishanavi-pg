'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    activeResidents: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadStats() {
      const [roomsRes, bedsRes, occupiedRes, residentsRes] = await Promise.all([
        supabase.from('rooms').select('id', { count: 'exact' }),
        supabase.from('beds').select('id', { count: 'exact' }),
        supabase.from('beds').select('id', { count: 'exact' }).eq('status', 'occupied'),
        supabase.from('residents').select('id', { count: 'exact' }).eq('status', 'active'),
      ])

      setStats({
        totalRooms: roomsRes.count || 0,
        totalBeds: bedsRes.count || 0,
        occupiedBeds: occupiedRes.count || 0,
        activeResidents: residentsRes.count || 0,
      })
      setLoading(false)
    }

    loadStats()
  }, [])

  const occupancyRate = stats.totalBeds > 0 
    ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) 
    : 0

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Overview</h1>
        
        {loading ? (
          <div>Loading system data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Total Rooms</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalRooms}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Total Capacity (Beds)</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalBeds}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Occupied Beds</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.occupiedBeds}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{occupancyRate}%</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}