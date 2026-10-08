// UI only: formulário para registrar manualmente a chegada de um corredor, usado quando a
// leitura do QR code falha (ex.: código danificado, câmera com problema).
import React, { useMemo, useState } from 'react'

/**
 * @param {{
 *   runners: Array<{ id: string, name: string, number?: string }>,
 *   onConfirm: (runner: { id: string, name: string, number?: string }) => Promise<void>|void,
 *   onCancel: () => void
 * }} props
 */
export default function ManualArrivalForm({ runners, onConfirm, onCancel }) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving] = useState(false)

  const filteredRunners = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return runners
    return runners.filter(r =>
      r.name.toLowerCase().includes(term)
      || r.id.toLowerCase().includes(term)
      || String(r.number ?? '').toLowerCase().includes(term)
    )
  }, [runners, search])

  const selectedRunner = runners.find(r => r.id === selectedId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedRunner) return
    setSaving(true)
    await onConfirm(selectedRunner)
    setSaving(false)
  }

  return (
    <form className="manual-arrival-form" onSubmit={handleSubmit}>
      <h3>Registrar chegada manualmente</h3>
      <p>Use esta opção quando não for possível ler o QR code do corredor.</p>

      <label>Buscar corredor (nome, número ou id)</label>
      <input
        value={search}
        onChange={e => { setSearch(e.target.value); setSelectedId('') }}
        placeholder="Digite nome, número ou id..."
        autoFocus
      />

      {search && (
        <ul className="manual-arrival-results">
          {filteredRunners.length === 0 && <li className="manual-arrival-empty">Nenhum corredor encontrado.</li>}
          {filteredRunners.map(r => (
            <li key={r.id}>
              <button
                type="button"
                className={`manual-arrival-option ${selectedId === r.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(r.id)}
              >
                Nº {r.number ?? '—'} · {r.name} <span className="manual-arrival-option-id">#{r.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedRunner && (
        <p className="manual-arrival-selected">
          Selecionado: <strong>Nº {selectedRunner.number ?? '—'} · {selectedRunner.name}</strong> (#{selectedRunner.id})
        </p>
      )}

      <div className="manual-arrival-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancelar</button>
        <button type="submit" disabled={!selectedRunner || saving}>
          {saving ? 'Registrando...' : 'Registrar chegada agora'}
        </button>
      </div>
    </form>
  )
}
