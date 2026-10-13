// UI only: tela pública de cadastro de corredores, acessada por link direto ou link + código (fora do login do organizador).
import React, { useEffect, useState } from 'react'
import { getRaceById } from '../races/races.repository.js'
import { useRunners } from './useRunners.js'
import { buildQRFilename } from './qr-filename.service.js'
import { maskCpf } from './runner-formatter.service.js'

export default function PublicRunnerRegister() {
  const [code, setCode] = useState('')
  const [race, setRace] = useState(null)
  const [checking, setChecking] = useState(false)
  const [gateError, setGateError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialCode = (params.get('corrida') || params.get('codigo') || '').trim()
    if (initialCode) {
      setCode(initialCode)
      setChecking(true)
      getRaceById(initialCode)
        .then((found) => {
          if (found) {
            setRace(found)
          } else {
            setGateError(`Corrida "${initialCode}" não encontrada. Verifique o link ou digite o código da corrida.`)
          }
        })
        .catch(() => {
          setGateError('Falha ao validar a corrida informada no link. Tente novamente.')
        })
        .finally(() => {
          setChecking(false)
        })
    }
  }, [])

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

  if (checking && !race) {
    return (
      <div className="app">
        <header className="app-header"><h1>Cadastro de corredores</h1></header>
        <main>
          <section className="create-race-section">
            <p>Carregando informações da corrida...</p>
          </section>
        </main>
      </div>
    )
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
                placeholder="Código da corrida (ex: CRT-13102026)"
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
  const [number, setNumber] = useState('')
  const [cpf, setCpf] = useState('')

  const handleNumberKeyDown = (e) => {
    if (
      [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End'
      ].includes(e.key)
    ) {
      return
    }
    if (e.ctrlKey || e.metaKey) {
      return
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault()
    }
  }

  const handleNumberPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    const digitsOnly = pasted.replace(/\D/g, '')
    if (digitsOnly) {
      setNumber(prev => `${prev}${digitsOnly}`)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await createRunner(name, number, cpf)
    if (result) {
      setName('')
      setNumber('')
      setCpf('')
    }
  }

  return (
    <div className="app">
      <header className="app-header"><h1>{race.name}</h1></header>
      <main>
        <section className="create-runner-section">
          <h2>Cadastrar corredor</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              placeholder="Número de peito do corredor (apenas números)"
              value={number}
              onKeyDown={handleNumberKeyDown}
              onPaste={handleNumberPaste}
              onChange={e => setNumber(e.target.value.replace(/\D/g, ''))}
              autoFocus
              required
            />
            <input
              placeholder="Nome do corredor"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="CPF do corredor (000.000.000-00)"
              value={cpf}
              onChange={e => setCpf(maskCpf(e.target.value))}
              maxLength={14}
              required
            />
            <button type="submit">Criar + Gerar QR</button>
          </form>
          {error && <p className="error">{error}</p>}

          {lastQrCode && (
            <div className="qr-preview">
              <p>QR gerado para <strong>{lastQrCode.runner.name}</strong> (nº {lastQrCode.runner.number}):</p>
              <img src={lastQrCode.qrDataUrl} alt={`QR de ${lastQrCode.runner.name}`} style={{ width: 200 }} />
              <a href={lastQrCode.qrDataUrl} download={buildQRFilename(lastQrCode.runner)}>Baixar PNG</a>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

