import React from 'react'
import Calendar from './components/Calendar.jsx'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Calendar</h1>
      </header>
      <main>
        <Calendar />
      </main>
    </div>
  )
}
