// src/layouts/MainLayout.jsx
import { Outlet } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
