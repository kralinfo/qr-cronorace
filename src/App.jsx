import React, { useState } from 'react'
import Scanner from './pages/Scanner'
import Admin from './pages/Admin'

export default function App(){
  const [tab, setTab] = useState('scanner')
  return (
    <div className="app">
      <header>
        <h1>PWA QR Timing</h1>
        <nav>
          <button onClick={() => setTab('scanner')}>Scanner</button>
          <button onClick={() => setTab('admin')}>Admin</button>
        </nav>
      </header>
      <main>
        {tab === 'scanner' ? <Scanner /> : <Admin />}
      </main>
      <footer>Offline-first • Export CSV • Deploy on Vercel/Netlify</footer>
    </div>
  )
}
