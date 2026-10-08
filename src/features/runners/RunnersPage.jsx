// UI only: cadastro de corredores e geração/download/impressão do QR code individual.
import React, { useState } from 'react'
import { useRunners } from './useRunners.js'
import { useActiveRace } from '../races/ActiveRaceContext.jsx'
import RunnerQRItem from './RunnerQRItem.jsx'
import { buildQRFilename } from './qr-filename.service.js'

export default function RunnersPage() {
  const { activeRace } = useActiveRace()
  const { runners, loading, error, lastQrCode, createRunner } = useRunners(activeRace?.id)
  const [name, setName] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    await createRunner(name)
    setName('')
  }

  return (
    <div className="runners-page">
      <section className="create-runner-section">
        <h2>Cadastrar corredor</h2>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Nome do corredor"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>Criar + Gerar QR</button>
        </form>
        {error && <p className="error">{error}</p>}

        {lastQrCode && (
          <div className="qr-preview">
            <p>QR gerado para <strong>{lastQrCode.runner.name}</strong> (id: {lastQrCode.runner.id}):</p>
            <img src={lastQrCode.qrDataUrl} alt={`QR de ${lastQrCode.runner.name}`} style={{ width: 200 }} />
            <a href={lastQrCode.qrDataUrl} download={buildQRFilename(lastQrCode.runner)}>Baixar PNG</a>
          </div>
        )}
      </section>

      <section className="runners-list-section">
        <h2>Corredores cadastrados</h2>
        {runners.length === 0 ? (
          <p>Nenhum corredor cadastrado ainda.</p>
        ) : (
          <ul className="runners-qr-list">
            {runners.map(r => <RunnerQRItem key={r.id} runner={r} />)}
          </ul>
        )}
      </section>
    </div>
  )
}

