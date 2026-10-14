// UI only: Barra de navegação fixa no canto inferior da tela (estilo Apple / App mobile)
import React from 'react'
import {
  IconHome,
  IconFlag,
  IconRunner,
  IconScanner,
  IconTrophy
} from './Icons.jsx'

/**
 * @param {{
 *   currentTab: string,
 *   onNavigate: (tab: string) => void,
 *   hasActiveRace?: boolean,
 *   isRaceStarted?: boolean
 * }} props
 */
export default function BottomNav({ currentTab, onNavigate, hasActiveRace = true, isRaceStarted = true }) {
  const items = hasActiveRace
    ? [
      { id: 'home', label: 'Início', icon: <IconHome size={22} /> },
      { id: 'races', label: 'Corridas', icon: <IconFlag size={22} /> },
      { id: 'runners', label: 'Corredores', icon: <IconRunner size={22} /> },
      {
        id: 'scanner',
        label: 'Scanner',
        icon: <IconScanner size={22} />,
        disabled: !isRaceStarted,
        badgeText: !isRaceStarted ? 'Fechado' : undefined
      },
      { id: 'results', label: 'Ranking', icon: <IconTrophy size={22} /> }
    ]
    : [
      { id: 'home', label: 'Início', icon: <IconHome size={22} /> },
      { id: 'races', label: 'Corridas', icon: <IconFlag size={22} /> },
      { id: 'runners', label: 'Corredores', icon: <IconRunner size={22} /> }
    ]

  return (
    <nav className="bottom-nav-bar" aria-label="Navegação principal inferior">
      {items.map(item => {
        const isActive = currentTab === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav-item ${isActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (item.disabled) return
              onNavigate(item.id)
            }}
            disabled={item.disabled}
            title={item.disabled ? 'A corrida precisa ser iniciada para marcar chegadas' : item.label}
          >
            <div className={`bottom-nav-icon-wrap ${isActive ? 'active-badge' : ''}`}>
              {item.icon}
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
