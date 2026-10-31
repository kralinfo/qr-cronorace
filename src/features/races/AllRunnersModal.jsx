import React, { useState, useMemo, useEffect } from 'react'
import { printRunnersTablePDF } from '../runners/print.service.js'
import RunnerQRModal from '../runners/RunnerQRModal.jsx'
import { useDialog } from '../../shared/DialogProvider.jsx'

export default function AllRunnersModal({
  isOpen,
  runners = [],
  raceName = '',
  distanceKm = '',
  onClose,
  onSelectRunner,
  onDeleteRunner
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGender, setFilterGender] = useState('ALL') // 'ALL' | 'MALE' | 'FEMALE'
  const dialog = useDialog()
  const [viewingQrRunner, setViewingQrRunner] = useState(null)

  useEffect(() => {
    const handleKey = (e) => {
      // Se o modal de QR estiver aberto, deixa ele ser fechado primeiro
      if (e.key === 'Escape' && isOpen && !viewingQrRunner) onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, viewingQrRunner, onClose])

  const maleCount = useMemo(() =>
    (runners || []).filter(r => (r.category || '').toUpperCase().includes('MASC')).length,
    [runners]
  )
  const femaleCount = useMemo(() =>
    (runners || []).filter(r => (r.category || '').toUpperCase().includes('FEM')).length,
    [runners]
  )

  const filteredRunners = useMemo(() => {
    let list = runners || []

    if (filterGender === 'MALE') {
      list = list.filter(r => (r.category || '').toUpperCase().includes('MASC'))
    } else if (filterGender === 'FEMALE') {
      list = list.filter(r => (r.category || '').toUpperCase().includes('FEM'))
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      list = list.filter(r =>
        (r.name || '').toLowerCase().includes(term) ||
        String(r.number || '').includes(term)
      )
    }

    return [...list].sort((a, b) => {
      const na = parseInt(a.number, 10)
      const nb = parseInt(b.number, 10)
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [runners, filterGender, searchTerm])

  if (!isOpen) return null

  return (
    <div
      className="arm-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      role="dialog"
      aria-modal="true"
    >
      <div className="arm-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho do Modal */}
        <div className="arm-topbar">
          <div className="arm-heading-group">
            <div className="arm-badge-row">
              <span className="arm-header-pill">LISTA OFICIAL</span>
              {distanceKm && <span className="arm-header-pill dist">{distanceKm}</span>}
            </div>
            <h2 className="arm-main-title">{raceName || 'Todos os Corredores'}</h2>
            <p className="arm-main-subtitle">
              Total de <strong>{runners.length}</strong> participante(s) cadastrado(s)
            </p>
          </div>

          <div className="arm-topbar-actions">
            <button
              type="button"
              className="arm-save-pdf-btn"
              onClick={() => printRunnersTablePDF(filteredRunners, raceName, distanceKm)}
              disabled={filteredRunners.length === 0}
              title="Abre a tela de impressão (onde você pode imprimir ou salvar em PDF)"
            >
              🖨 Imprimir / Salvar PDF
            </button>
            <button
              type="button"
              className="arm-close-icon-btn"
              onClick={onClose}
              title="Fechar (Esc)"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra de Filtros: Campo de Busca + Abas Todos / Masculino / Feminino */}
        <div className="arm-search-row">
          <div className="arm-input-wrapper">
            <span className="arm-search-icon">🔍</span>
            <input
              type="text"
              className="arm-text-input"
              placeholder="Buscar por nome ou número de peito..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="arm-clear-search-btn"
                onClick={() => setSearchTerm('')}
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          <div className="arm-tabs">
            <button
              type="button"
              className={`arm-tab-btn ${filterGender === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterGender('ALL')}
            >
              Todos ({runners.length})
            </button>
            <button
              type="button"
              className={`arm-tab-btn male ${filterGender === 'MALE' ? 'active' : ''}`}
              onClick={() => setFilterGender('MALE')}
            >
              <span className="arm-tab-dot male" /> Masculino ({maleCount})
            </button>
            <button
              type="button"
              className={`arm-tab-btn female ${filterGender === 'FEMALE' ? 'active' : ''}`}
              onClick={() => setFilterGender('FEMALE')}
            >
              <span className="arm-tab-dot female" /> Feminino ({femaleCount})
            </button>
          </div>
        </div>

        {/* Conteúdo: Tabela de Corredores */}
        <div className="arm-table-wrap">
          <table className="arm-grid-table">
            <thead>
              <tr>
                <th className="th-num">Nº PEITO</th>
                <th className="th-name">NOME DO CORREDOR</th>
                <th className="th-cat">CATEGORIA</th>
                <th className="th-actions">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filteredRunners.length === 0 ? (
                <tr className="arm-empty-row">
                  <td colSpan={4}>
                    <div className="arm-empty">
                      <span className="arm-empty-icon">🏃</span>
                      <p>
                        {searchTerm
                          ? `Nenhum corredor encontrado para "${searchTerm}".`
                          : 'Nenhum corredor cadastrado nesta categoria.'}
                      </p>
                      {searchTerm && (
                        <button
                          type="button"
                          className="arm-cat-filter-clear"
                          onClick={() => setSearchTerm('')}
                          style={{ marginTop: 8 }}
                        >
                          Limpar busca
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filteredRunners.map(runner => {
                const isMale = (runner.category || '').toUpperCase().includes('MASC')
                const isLocal = (runner.category || '').toUpperCase().includes('LOCAL')
                const isPcd = (runner.category || '').toUpperCase().includes('PCD')
                const is60 = (runner.category || '').toUpperCase().includes('+60') || (runner.category || '').toUpperCase().includes('60')

                return (
                  <tr key={runner.id} className="arm-tr">
                    <td className="td-num">
                      <span className={`arm-bib-badge ${isMale ? 'male' : 'female'}`}>
                        {runner.number || '—'}
                      </span>
                    </td>
                    <td className="td-name">
                      <span className="arm-runner-name">{runner.name}</span>
                    </td>
                    <td className="td-cat">
                      <div className="arm-badges-group">
                        <span className={`arm-cat-pill ${isMale ? 'male' : 'female'}`}>
                          {isMale ? 'Masculino' : 'Feminino'}
                        </span>
                        {isLocal ? (
                          <span className="arm-flag local">Local</span>
                        ) : (
                          <span className="arm-flag visitor">Visitante</span>
                        )}
                        {isPcd && <span className="arm-flag pcd">PCD</span>}
                        {is60 && <span className="arm-flag age">+60</span>}
                      </div>
                    </td>
                    <td className="td-actions">
                      <div className="arm-action-buttons">
                        <button
                          type="button"
                          className="arm-action-btn qr"
                          onClick={() => {
                            setViewingQrRunner(runner)
                            onSelectRunner?.(runner)
                          }}
                          title="Ver e Imprimir Código de Barras"
                        >
                          📷 Código de barras
                        </button>
                        {onDeleteRunner && (
                          <button
                            type="button"
                            className="arm-action-btn del"
                            onClick={async () => {
                              if (await dialog.confirm(`Deseja realmente excluir ${runner.name} (Nº ${runner.number})?`)) {
                                onDeleteRunner(runner.id)
                              }
                            }}
                            title="Excluir participante"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé do Modal */}
        <div className="arm-bottom-bar">
          <span className="arm-bottom-count">
            Mostrando <strong>{filteredRunners.length}</strong> de <strong>{runners.length}</strong> corredor(es)
          </span>
          <button type="button" className="arm-close-bottom-btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>

      {/* Modal de QR Code do Corredor (abre em cima desta tela sem fechar) */}
      {viewingQrRunner && (
        <RunnerQRModal
          runner={viewingQrRunner}
          raceName={raceName}
          onClose={() => setViewingQrRunner(null)}
        />
      )}
    </div>
  )
}
