
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout({ username }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#e9eef5]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-screen lg:pl-64">
        <Header
          username={username}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="w-full p-4 sm:p-6 lg:p-8 2xl:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
