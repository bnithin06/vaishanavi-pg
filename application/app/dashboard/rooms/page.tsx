'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { RoomWithBeds } from '@/lib/types'
import { Plus, Bed as BedIcon } from 'lucide-react'

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomWithBeds[]>([])
  const [roomNumber, setRoomNumber] = useState('')
  const [floor, setFloor] = useState<number>(1)
  const [capacity, setCapacity] = useState<number>(2)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchRooms = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        beds (
          *,
          residents (*)
        )
      `)
      .order('room_number', { ascending: true })

    if (!error && data) {
      setRooms(data as RoomWithBeds[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 1. Create Room
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert({ room_number: roomNumber, floor, capacity })
      .select()
      .single()

    if (roomError) {
      alert(roomError.message)
      return
    }

    // 2. Automatically generate beds based on capacity
    const newBeds = Array.from({ length: capacity }, (_, i) => ({
      room_id: roomData.id,
      bed_number: `${roomNumber}-${String.fromCharCode(65 + i)}`, // e.g. 101-A, 101-B
      status: 'available'
    }))

    const { error: bedError } = await supabase.from('beds').insert(newBeds)

    if (bedError) {
      alert(bedError.message)
    } else {
      setRoomNumber('')
      fetchRooms()
    }
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Rooms & Beds</h1>

        {/* Create Room Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add New Room</h2>
          <form onSubmit={handleCreateRoom} className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Room Number</label>
              <input
                type="text"
                required
                className="mt-1 border px-3 py-2 rounded-md"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Floor</label>
              <input
                type="number"
                required
                className="mt-1 border px-3 py-2 rounded-md w-24"
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Capacity (Beds)</label>
              <input
                type="number"
                min="1"
                required
                className="mt-1 border px-3 py-2 rounded-md w-28"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus size={18} /> Add Room
            </button>
          </form>
        </div>

        {/* Rooms Grid */}
        {loading ? (
          <div>Loading rooms...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h3 className="text-xl font-bold text-gray-800">Room {room.room_number}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    Floor {room.floor}
                  </span>
                </div>

                <div className="space-y-3">
                  {room.beds?.map((bed) => (
                    <div
                      key={bed.id}
                      className={`flex justify-between items-center p-3 rounded-lg border ${
                        bed.status === 'occupied'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <BedIcon
                          size={18}
                          className={bed.status === 'occupied' ? 'text-amber-600' : 'text-emerald-600'}
                        />
                        <span className="font-medium">{bed.bed_number}</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded font-semibold ${
                          bed.status === 'occupied'
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-emerald-200 text-emerald-800'
                        }`}
                      >
                        {bed.status === 'occupied'
                          ? bed.residents?.full_name || 'Occupied'
                          : 'Available'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}