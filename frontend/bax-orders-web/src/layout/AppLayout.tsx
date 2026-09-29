import { useState } from 'react'
import { Outlet } from 'react-router'
import { SandboxBanner } from '../environment/SandboxBanner'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-[260px]">
        {/* Nothing in the normal system; in the test environment, on every page above everything else. */}
        <SandboxBanner />
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="px-4 py-6 pb-10 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
