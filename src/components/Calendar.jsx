import React, { useEffect, useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'

function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function computeConflicts(dayEvents) {
  const events = dayEvents
    .map((e) => ({
      ...e,
      _start: parseTimeToMinutes(e.time),
      _end: parseTimeToMinutes(e.time) + (e.duration || 0),
    }))
    .sort((a, b) => a._start - b._start)

  let conflicts = false
  // Greedy coloring: assign a lane index to overlapping events
  const lanes = []
  events.forEach((ev) => {
    let placed = false
    for (let i = 0; i < lanes.length; i++) {
      const last = lanes[i][lanes[i].length - 1]
      if (!last || ev._start >= last._end) {
        lanes[i].push(ev)
        ev._lane = i
        placed = true
        break
      } else {
        conflicts = true
      }
    }
    if (!placed) {
      ev._lane = lanes.length
      lanes.push([ev])
    }
  })
  return { events, conflicts, lanes: lanes.length }
}

export default function Calendar() {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(today)
  const [eventsByDate, setEventsByDate] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    fetch('/events.json')
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return
        const grouped = {}
        data.forEach((e) => {
          const key = e.date
          grouped[key] = grouped[key] || []
          grouped[key].push(e)
        })
        setEventsByDate(grouped)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        if (mounted) {
          setError('Failed to load events')
          setLoading(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  const monthMatrix = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const rows = []
    let day = startDate
    let row = []
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        row.push(day)
        day = addDays(day, 1)
      }
      rows.push(row)
      row = []
    }
    return rows
  }, [currentDate])

  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          className="nav-btn"
          onClick={() => setCurrentDate((d) => subMonths(d, 1))}
          aria-label="Previous month"
        >
          ◀
        </button>
        <div className="month-title">{format(currentDate, 'MMMM yyyy')}</div>
        <button
          className="nav-btn"
          onClick={() => setCurrentDate((d) => addMonths(d, 1))}
          aria-label="Next month"
        >
          ▶
        </button>
      </div>

      <div className="weekdays">
        {weekDayLabels.map((lbl) => (
          <div key={lbl} className="weekday">
            {lbl}
          </div>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="grid">
        {monthMatrix.map((week, wi) => (
          <div key={wi} className="week-row">
            {week.map((day, di) => {
              const inMonth = isSameMonth(day, currentDate)
              const isToday = isSameDay(day, today)
              const key = format(day, 'yyyy-MM-dd')
              const rawEvents = eventsByDate[key] || []
              const { events, conflicts, lanes } = computeConflicts(rawEvents)
              return (
                <div
                  key={di}
                  className={
                    'cell' +
                    (inMonth ? '' : ' is-out') +
                    (isToday ? ' is-today' : '')
                  }
                >
                  <div className="cell-top">
                    <div className="day-number">{format(day, 'd')}</div>
                    {conflicts && <div className="conflict-indicator" title="Overlapping events">!</div>}
                  </div>
                  <div className="events" data-lanes={lanes}>
                    {events.map((e, idx) => (
                      <div
                        key={idx}
                        className={`event-badge lane-${e._lane}`}
                        title={`${e.title} • ${e.time} (${e.duration}m)`}
                      >
                        <span className="event-time">{e.time}</span>
                        <span className="event-title">{e.title}</span>
                      </div>
                    ))}
                    {loading && wi === 0 && di === 0 && (
                      <div className="loading">Loading events…</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
