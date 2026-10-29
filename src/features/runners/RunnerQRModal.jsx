import React, { useState, useEffect } from 'react'
import Modal from '../../shared/Modal.jsx'
import { generateRunnerQRCode } from './qrcode.service.js'
import { isBluetoothSupported, printRunnerToBluetooth } from './bluetooth-printer.service.js'
import { buildQRFilename } from './qr-filename.service.js'

export default function RunnerQRModal({ runner, raceName, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [printingBt, setPrintingBt] = useState(false)

  useEffect(() => {
    let active = true
    if (!runner) return
    setLoading(true)
    generateRunnerQRCode(runner).then(url => {
      if (active) {
        setQrDataUrl(url)
        setLoading(false)
      }
    }).catch(err => {
      console.error('Erro ao gerar QR Code:', err)
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [runner])

  const handlePrintBt = async () => {
    if (!qrDataUrl || !runner) return
    setPrintingBt(true)
    try {
      await printRunnerToBluetooth(qrDataUrl, runner, raceName)
    } catch (err) {
      if (err.name !== 'NotFoundError' && !err.message?.includes('User cancelled')) {
        alert(`Erro na impressora Bluetooth: ${err.message || 'Verifique se a impressora térmica está ligada.'}`)
      }
    } finally {
      setPrintingBt(false)
    }
  }

  if (!runner) return null

  return (
    <Modal title={`QR Code — ${runner.name}`} onClose={onClose} maxWidth={440}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '10px 0' }}>
        {loading ? (
          <p style={{ color: '#64748b', fontWeight: 600 }}>Gerando QR Code...</p>
        ) : (
          <>
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0' }}>
              <img src={qrDataUrl} alt={`QR de ${runner.name}`} style={{ width: 200, height: 200, display: 'block' }} />
            </div>

            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{runner.name}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                {runner.number && (
                  <span style={{
                    background: '#f1f5f9',
                    color: '#000000',
                    border: '2px solid #cbd5e1',
                    padding: '4px 16px',
                    borderRadius: 10,
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    letterSpacing: '0.04em'
                  }}>
                    Nº {runner.number}
                  </span>
                )}
                {runner.category && (
                  <span style={{
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1.5px solid #e2e8f0',
                    padding: '4px 14px',
                    borderRadius: 10,
                    fontSize: '0.9rem',
                    fontWeight: 700
                  }}>
                    {runner.category}
                  </span>
                )}
              </div>
            </div>

            <div className="qr-result-actions" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="qr-action-btn qr-action-thermal"
                onClick={handlePrintBt}
                disabled={printingBt}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  height: 44,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: 10
                }}
              >
                🖨 {printingBt ? 'Enviando...' : 'Imprimir Térmica'}
              </button>

              <a
                className="qr-action-btn qr-action-download active-download-btn"
                href={qrDataUrl}
                download={buildQRFilename(runner)}
                style={{
                  width: '100%',
                  textAlign: 'center',
                  justifyContent: 'center',
                  height: 44,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  boxShadow: '0 3px 12px rgba(37, 99, 235, 0.3)',
                  border: 'none',
                  textDecoration: 'none'
                }}
              >
                ⬇ Baixar Imagem (PNG)
              </a>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
