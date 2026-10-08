// UI only: tela pública de cadastro de corredores, acessada por um link + código (fora do login do organizador).
import React, { useState } from 'react'
import { getRaceById } from '../races/races.repository.js'
import { useRunners } from './useRunners.js'
import { buildQRFilename } from './qr-filename.service.js'

export default function PublicRunnerRegister() {
  const [code, setCode] = useState('')
  const [race, setRace] = useState(null)
  const [checking, setChecking] = useState(false)
  const [gateError, setGateError] = useState(null)

  const handleValidate = async (e) => {
    e.preventDefault()
    setGateError(null)
    setChecking(true)
    try {
      const found = await getRaceById(code.trim())
      if (found) setRace(found)
      else setGateError('Código inválido. Confira o código que foi enviado para você.')
    } catch (err) {
      setGateError('Falha ao validar o código. Tente novamente.')
    } finally {
      setChecking(false)
    }
  }

  if (!race) {
    return (
      <div className="app">
        <header className="app-header"><h1>Cadastro de corredores</h1></header>
        <main>
          <section className="create-race-section">
            <h2>Informe o código da corrida</h2>
            <p>Digite o código que a pessoa organizadora te enviou junto com este link.</p>
            <form onSubmit={handleValidate}>
              <input
                placeholder="Código da corrida"
                value={code}
                onChange={e => setCode(e.target.value)}
                autoFocus
                required
              />
              <button type="submit" disabled={checking}>Entrar</button>
            </form>
            {gateError && <p className="error">{gateError}</p>}
          </section>
        </main>
      </div>
    )
  }

  return <RegisterForm race={race} />
}

function RegisterForm({ race }) {
  const { error, lastQrCode, createRunner } = useRunners(race.id)
  const [name, setName] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    await createRunner(name)
    setName('')
  }

  return (
    <div className="app">
      <header className="app-header"><h1>{race.name}</h1></header>
      <main>
        <section className="create-runner-section">
          <h2>Cadastrar corredor</h2>
          <form onSubmit={handleSubmit}>
            <input
              placeholder="Nome do corredor"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              required
            />
            <button type="submit">Criar + Gerar QR</button>
          </form>
          {error && <p className="error">{error}</p>}

          {lastQrCode && (
            <div className="qr-preview">
              <p>QR gerado para <strong>{lastQrCode.runner.name}</strong>:</p>
              <img src={lastQrCode.qrDataUrl} alt={`QR de ${lastQrCode.runner.name}`} style={{ width: 200 }} />
              <a href={lastQrCode.qrDataUrl} download={buildQRFilename(lastQrCode.runner)}>Baixar PNG</a>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
