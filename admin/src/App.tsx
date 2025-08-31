
import { Router } from 'wouter'
import { AdminRoutes } from './components/AdminRoutes'
import { Toaster } from './components/ui/toaster'

function App() {
  return (
    <Router base="/admin">
      <div className="min-h-screen bg-gray-50">
        <AdminRoutes />
        <Toaster />
      </div>
    </Router>
  )
}

export default App
