// UI only: menu lateral (drawer) com visual Apple (iOS Sidebar/Sheet) e ícones SVG minimalistas
import React from 'react'
import {
  IconHome,
  IconFlag,
  IconRunner,
  IconScanner,
  IconTrophy,
  IconClose
} from './Icons.jsx'

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   currentTab: string,
 *   onNavigate: (tab: string) => void,
 *   raceName: string,
 *   onChangeRace: () => void,
 *   hasActiveRace?: boolean,
 *   isRaceStarted?: boolean
 * }} props
 */
export default function AppMenu({ isOpen, onClose, currentTab, onNavigate, raceName, onChangeRace, hasActiveRace = true, isRaceStarted = true }) {
  const items = hasActiveRace
    ? [
      { id: 'home', label: 'Início', icon: <IconHome size={20} /> },
      { id: 'races', label: 'Corridas', icon: <IconFlag size={20} /> },
      { id: 'runners', label: 'Corredores', icon: <IconRunner size={20} /> },
      {
        id: 'scanner',
        label: 'Scanner',
        icon: <IconScanner size={20} />,
        disabled: !isRaceStarted,
        subtitle: !isRaceStarted ? 'Não iniciada' : undefined
      },
      { id: 'results', label: 'Ranking', icon: <IconTrophy size={20} /> }
    ]
    : [
      { id: 'home', label: 'Início', icon: <IconHome size={20} /> },
      { id: 'races', label: 'Corridas', icon: <IconFlag size={20} /> },
      { id: 'runners', label: 'Corredores', icon: <IconRunner size={20} /> }
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
          <div className="app-menu-header-text">
            <span className="app-menu-header-label">Corrida ativa</span>
            <strong className="app-menu-header-title">{raceName}</strong>
          </div>
          <button className="menu-close-btn" onClick={onClose} aria-label="Fechar menu">
            <IconClose size={18} />
          </button>
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
