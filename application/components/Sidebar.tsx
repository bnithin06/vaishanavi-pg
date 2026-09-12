'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, DoorClosed, Users, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/rooms', label: 'Rooms & Beds', icon: DoorClosed },
    { href: '/dashboard/residents', label: 'Residents', icon: Users },
  ]

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col justify-between">
      <div>
        <div className="text-xl font-bold p-4 border-b border-slate-800">
          Hostel Manager
        </div>
        <nav className="mt-6 space-y-1">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
      >
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </aside>
  )
}