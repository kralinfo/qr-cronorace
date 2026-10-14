// UI only: seletor de data moderno em camada flutuante estilo Apple/iOS.
import React, { useEffect, useRef, useState } from 'react'
import { IconCalendar, IconChevronLeft, IconChevronRight, IconClose } from './Icons.jsx'
import { formatDateOnlyBR } from '../features/races/date-only.formatter.js'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]
const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * @param {{
 *   value: string,
 *   onChange: (dateStr: string) => void,
 *   label?: string,
 *   required?: boolean,
 *   id?: string
 * }} props
 */
export default function DatePickerField({ value, onChange, label, required = false, id }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Data atual de referência para navegação no calendário
  const initialDate = value ? new Date(`${value}T12:00:00`) : new Date()
  const [viewYear, setViewYear] = useState(initialDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth())

  useEffect(() => {
    if (value) {
      const d = new Date(`${value}T12:00:00`)
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear())
        setViewMonth(d.getMonth())
      }
    }
  }, [value])

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Navegar mês
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(prev => prev - 1)
    } else {
      setViewMonth(prev => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(prev => prev + 1)
    } else {
      setViewMonth(prev => prev + 1)
    }
  }

  // Gera dias do mês
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const todayStr = (() => {
    const d = new Date()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
  })()

  const handleSelectDay = (day) => {
    const m = String(viewMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    const dateStr = `${viewYear}-${m}-${d}`
    onChange(dateStr)
    setOpen(false)
  }

  const handleSelectToday = () => {
    onChange(todayStr)
    const d = new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
    setOpen(false)
  }

  return (
    <div className="datepicker-field-wrap" ref={containerRef}>
      {label && <label htmlFor={id} className="datepicker-label">{label}</label>}
      <button
        type="button"
        id={id}
        className={`datepicker-trigger-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
      >
        <span className="datepicker-icon"><IconCalendar size={18} /></span>
        <span className={`datepicker-value ${!value ? 'placeholder' : ''}`}>
          {value ? formatDateOnlyBR(value) : 'Selecione a data'}
        </span>
      </button>

      {open && (
        <div className="datepicker-popover" role="dialog" aria-modal="true">
          <div className="datepicker-header">
            <button
              type="button"
              className="datepicker-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
            >
              <IconChevronLeft size={16} />
            </button>
            <span className="datepicker-month-label">
              <strong>{MONTH_NAMES[viewMonth]}</strong> {viewYear}
            </span>
            <button
              type="button"
              className="datepicker-nav-btn"
              onClick={handleNextMonth}
              aria-label="Próximo mês"
            >
              <IconChevronRight size={16} />
            </button>
          </div>

          <div className="datepicker-weekdays">
            {WEEKDAY_NAMES.map(w => (
              <span key={w} className="datepicker-weekday">{w}</span>
            ))}
          </div>

          <div className="datepicker-days-grid">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <span key={`empty-${i}`} className="datepicker-day empty" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const m = String(viewMonth + 1).padStart(2, '0')
              const d = String(day).padStart(2, '0')
              const dayStr = `${viewYear}-${m}-${d}`
              const isSelected = value === dayStr
              const isToday = todayStr === dayStr

              return (
                <button
                  key={day}
                  type="button"
                  className={`datepicker-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => handleSelectDay(day)}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="datepicker-footer">
            <button
              type="button"
              className="datepicker-today-btn"
              onClick={handleSelectToday}
            >
              Hoje
            </button>
            <button
              type="button"
              className="datepicker-close-btn"
              onClick={() => setOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
