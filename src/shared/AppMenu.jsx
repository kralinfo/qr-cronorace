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
export default function AppMenu({ isOpen, onClose, currentTab, onNavigate, raceName, onChangeRace, hasActiveRace = true }) {
  const items = hasActiveRace
    ? [
      { id: 'home', label: 'Início', icon: '🏠' },
      { id: 'runners', label: 'Corredores', icon: '🏃' },
      { id: 'scanner', label: 'Scanner', icon: '📷' },
      { id: 'results', label: 'Ranking', icon: '🏆' }
    ]
    : [{ id: 'home', label: 'Início', icon: '🏠' }]

  const handleNavigate = (tab) => {
    onNavigate(tab)
    onClose()
  }

  const handleChangeRace = () => {
    onChangeRace()
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
              className={`app-menu-item ${currentTab === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
            >
              <span className="app-menu-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          {hasActiveRace && (
            <button className="app-menu-item app-menu-change-race" onClick={handleChangeRace}>
              <span className="app-menu-icon">🔄</span>
              Trocar corrida
            </button>
          )}
        </nav>
      </aside>
    </>
  )
}
