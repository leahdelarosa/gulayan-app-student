import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AuthenticatedUserLayout from './layout/AuthenticatedUserLayout'
import NotFound from './pages/NotFound'
import Dashboard from './pages/Dashboard'
import Records from './pages/Records'
import Settings from './pages/Settings'
import { Toaster } from 'sonner';

// sample lea
//adasdasdadsa
function App() {

  return (
    <BrowserRouter>
      <Toaster richColors position='top-right' />
      <Routes>  
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/*" element={<NotFound/>} />

        <Route  element={ <AuthenticatedUserLayout />} >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-plants" element={<Records />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
