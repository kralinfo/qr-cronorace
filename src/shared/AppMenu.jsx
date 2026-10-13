// UI only: menu lateral (drawer) com acesso às áreas do app, pensado para mobile.
import React from 'react'

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   currentTab: string,
 *   onNavigate: (tab: string) => void,
 *   raceName: string,
 *   onChangeRace: () => void,
 *   hasActiveRace?: boolean
 * }} props
 */
export default function AppMenu({ isOpen, onClose, currentTab, onNavigate, raceName, onChangeRace, hasActiveRace = true, isRaceStarted = true }) {
  const items = hasActiveRace
    ? [
      { id: 'home', label: 'Início', icon: '🏠' },
      { id: 'races', label: 'Corridas', icon: '🏁' },
      { id: 'runners', label: 'Corredores', icon: '🏃' },
      {
        id: 'scanner',
        label: 'Scanner',
        icon: '📷',
        disabled: !isRaceStarted,
        subtitle: !isRaceStarted ? 'Não iniciada' : undefined
      },
      { id: 'results', label: 'Ranking', icon: '🏆' }
    ]
    : [
      { id: 'home', label: 'Início', icon: '🏠' },
      { id: 'races', label: 'Corridas', icon: '🏁' },
      { id: 'runners', label: 'Corredores', icon: '🏃' }
    ]

  const handleNavigate = (tab) => {
    onNavigate(tab)
    onClose()
  }

  return (
    <>
      {isOpen && <div className="menu-overlay" onClick={onClose} />}
      <aside className={`app-menu ${isOpen ? 'open' : ''}`}>
        <div className="app-menu-header">
          <strong>{raceName}</strong>
          <button className="menu-close-btn" onClick={onClose} aria-label="Fechar menu">✕</button>
        </div>
        <nav className="app-menu-nav">
          {items.map(item => (
            <button
              key={item.id}
              className={`app-menu-item ${currentTab === item.id ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
              onClick={() => {
                if (item.disabled) return
                handleNavigate(item.id)
              }}
              disabled={item.disabled}
              title={item.disabled ? 'A corrida precisa ser iniciada para marcar chegadas' : undefined}
            >
              <span className="app-menu-icon">{item.icon}</span>
              <span className="app-menu-label-wrap">
                {item.label}
                {item.subtitle ? <span className="app-menu-badge-disabled"> ({item.subtitle})</span> : null}
              </span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  )
}
