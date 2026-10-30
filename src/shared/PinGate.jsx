// Guardião de acesso: exige PIN antes de mostrar o sistema principal.
import React, { useState, useCallback } from 'react'

const SESSION_KEY = 'qr-cronorace:auth-v1'

// PIN padrão de segurança: "123456"
const DEFAULT_PIN = '123456'
const DEFAULT_PIN_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'

// Suporta VITE_APP_PIN direto (ex: VITE_APP_PIN=123456) OU VITE_APP_PIN_HASH
const CONFIG_PIN = (import.meta.env.VITE_APP_PIN || '').trim()
const CONFIG_PIN_HASH = (import.meta.env.VITE_APP_PIN_HASH || DEFAULT_PIN_HASH).trim().toLowerCase()

/**
 * SHA-256 puro em JavaScript.
 * Funciona de forma 100% garantida em HTTP, HTTPS, localhost, mobile ou desktop,
 * mesmo em navegadores ou conexões IP locais onde window.crypto.subtle é indisponível.
 */
function sha256pure(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount))
  }
  var mathPow = Math.pow
  var maxWord = mathPow(2, 32)
  var lengthProperty = 'length'
  var i, j
  var result = ''
  var words = []
  var asciiBitLength = ascii[lengthProperty] * 8
  var hash = [], k = []
  var primeCounter = 0
  var isComposite = {}
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0
    }
  }
  ascii += '\x80'
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00'
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i)
    if (j >> 8) return ''
    words[i >> 2] |= j << ((3 - (i % 4)) * 8)
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0
  words[words[lengthProperty]] = asciiBitLength
  for (j = 0; j < words[lengthProperty]; ) {
    var w = words.slice(j, (j += 16))
    var oldHash = hash
    hash = hash.slice(0, 8)
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2]
      var s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)
      var s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)
      w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0
      var ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6])
      var maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2])
      var temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + w[i]
      var temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj
      hash = [(temp1 + temp2) | 0].concat(hash)
      hash[4] = (hash[4] + temp1) | 0
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0
    }
  }
  for (i = 0; i < 8; i++) {
    for (var i2 = 3; i2 >= 0; i2--) {
      var b = (hash[i] >> (i2 * 8)) & 255
      result += (b < 16 ? '0' : '') + b.toString(16)
    }
  }
  return result
}

export default function PinGate({ children }) {
  const [authed, setAuthed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      return false
    }
  })
  const [pin, setPin]     = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy]   = useState(false)

  // Já autenticado → renderiza o sistema normalmente
  if (authed) return children

  const handleValidatePin = (inputPin) => {
    const raw = String(inputPin || '').trim()
    if (!raw) return false

    // 1. Confere se digitou o PIN direto caso configurado
    if (CONFIG_PIN && raw === CONFIG_PIN) return true
    if (!CONFIG_PIN && raw === DEFAULT_PIN) return true

    // 2. Confere via hash SHA-256
    const hash = sha256pure(raw)
    if (hash === CONFIG_PIN_HASH) return true

    return false
  }

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    if (!pin.trim() || busy) return

    setBusy(true)
    setError(false)

    try {
      const isValid = handleValidatePin(pin)
      if (isValid) {
        try {
          sessionStorage.setItem(SESSION_KEY, '1')
        } catch {}
        setAuthed(true)
      } else {
        setError(true)
        setPin('')
      }
    } catch (err) {
      console.error('Erro ao validar PIN:', err)
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#06020c',
      backgroundImage: `
        radial-gradient(ellipse 80% 50% at 50% -5%, rgba(139,92,246,0.18), transparent 65%),
        repeating-linear-gradient(45deg, rgba(255,255,255,0.006) 0, rgba(255,255,255,0.006) 2px, transparent 2px, transparent 14px)
      `,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      boxSizing: 'border-box',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 36,
      }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: 12,
          background: 'linear-gradient(135deg,#7c3aed,#db2777)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
          boxShadow: '0 0 20px rgba(124,58,237,0.45)',
        }}>⚡</div>
        <span style={{
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          background: 'linear-gradient(to right,#c084fc,#f472b6,#e2e8f0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>QR CRONORACE</span>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: '#100b1a',
        border: '1.5px solid rgba(139,92,246,0.35)',
        borderRadius: 20,
        padding: '28px 24px 24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.75), 0 0 30px rgba(124,58,237,0.15)',
        boxSizing: 'border-box',
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.18em',
          color: '#a78bfa',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>🔒 ACESSO RESTRITO</div>

        <h1 style={{
          margin: '0 0 6px',
          fontSize: 22,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '0.01em',
        }}>Sistema de Gestão</h1>

        <p style={{
          margin: '0 0 24px',
          fontSize: 13,
          color: '#64748b',
          lineHeight: 1.5,
        }}>
          Área exclusiva para organizadores.<br/>
          Informe o PIN de acesso para continuar.
        </p>

        <form onSubmit={handleSubmit} autoComplete="off">
          <label style={{
            display: 'block',
            fontSize: 10,
            fontWeight: 800,
            color: '#6b7280',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>PIN</label>

          <input
            type="password"
            inputMode="numeric"
            placeholder="••••••"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(false) }}
            autoFocus
            style={{
              width: '100%',
              height: 48,
              background: '#0a0614',
              border: `2px solid ${error ? 'rgba(239,68,68,0.6)' : 'rgba(139,92,246,0.3)'}`,
              borderRadius: 12,
              color: '#fff',
              fontSize: 22,
              fontWeight: 700,
              textAlign: 'center',
              letterSpacing: '0.3em',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
              fontFamily: 'monospace',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(168,85,247,0.7)' }}
            onBlur={e => { e.target.style.borderColor = error ? 'rgba(239,68,68,0.6)' : 'rgba(139,92,246,0.3)' }}
          />

          {error && (
            <div style={{
              marginTop: 8,
              fontSize: 12,
              color: '#f87171',
              fontWeight: 600,
              textAlign: 'center',
            }}>
              ✕ PIN incorreto. Tente novamente.
            </div>
          )}

          <button
            type="submit"
            disabled={!pin.trim() || busy}
            style={{
              width: '100%',
              marginTop: 16,
              height: 48,
              borderRadius: 12,
              border: 'none',
              background: (!pin.trim() || busy)
                ? 'rgba(124,58,237,0.25)'
                : 'linear-gradient(135deg,#7c3aed,#9333ea)',
              color: (!pin.trim() || busy) ? 'rgba(255,255,255,0.35)' : '#fff',
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.05em',
              cursor: (!pin.trim() || busy) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: (!pin.trim() || busy) ? 'none' : '0 6px 20px rgba(124,58,237,0.45)',
              transition: 'all 0.15s',
            }}
          >
            {busy ? '⏳ Verificando...' : '🔓 Entrar'}
          </button>
        </form>
      </div>

      <p style={{
        marginTop: 28,
        fontSize: 11,
        color: '#374151',
        textAlign: 'center',
        letterSpacing: '0.04em',
      }}>
        Acesso exclusivo para organizadores da corrida.
      </p>
    </div>
  )
}
