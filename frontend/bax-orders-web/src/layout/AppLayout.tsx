import { useState } from 'react'
import { Outlet } from 'react-router'
import { SandboxBanner } from '../environment/SandboxBanner'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        {/* Nothing in the normal system; in the test environment, on every page above everything else. */}
        <SandboxBanner />
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="px-margin-mobile py-space-lg sm:px-space-lg lg:px-space-xl lg:py-space-xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
