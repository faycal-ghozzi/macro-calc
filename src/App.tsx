import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import FoodLog from './pages/FoodLog'
import Meals from './pages/Meals'
import WeightTracker from './pages/WeightTracker'
import Profile from './pages/Profile'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Auth />

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/log" element={<FoodLog />} />
      <Route path="/meals" element={<Meals />} />
      <Route path="/weight" element={<WeightTracker />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
