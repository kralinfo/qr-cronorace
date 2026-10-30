import React, { useState, useEffect } from 'react'
import Modal from '../../shared/Modal.jsx'
import { generateRunnerThermalLabel } from './barcode.service.js'
import { isBluetoothSupported, printRunnerToBluetooth } from './bluetooth-printer.service.js'
import { printRunnerQRCode } from './print.service.js'
import { buildQRFilename } from './qr-filename.service.js'

export default function RunnerQRModal({ runner, raceName, onClose }) {
  const [labelDataUrl, setLabelDataUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [printingBt, setPrintingBt] = useState(false)

  useEffect(() => {
    let active = true
    if (!runner) return
    setLoading(true)
    generateRunnerThermalLabel(runner, { rotatedForThermal: false }).then(url => {
      if (active) {
        setLabelDataUrl(url)
        setLoading(false)
      }
    }).catch(err => {
      console.error('Erro ao gerar etiqueta adesiva:', err)
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [runner])

  const handlePrintBt = async () => {
    if (!runner) return
    if (!isBluetoothSupported()) {
      printRunnerQRCode(labelDataUrl, runner, raceName)
      return
    }
    setPrintingBt(true)
    try {
      await printRunnerToBluetooth(labelDataUrl, runner, raceName)
    } catch (err) {
      if (err.name !== 'NotFoundError' && !err.message?.includes('User cancelled')) {
        alert('Erro na impressora Bluetooth: ' + (err.message || 'Verifique se a impressora térmica está ligada.'))
      }
    } finally {
      setPrintingBt(false)
    }
  }

  const handlePrintSystem = () => {
    if (!runner) return
    printRunnerQRCode(labelDataUrl, runner, raceName)
  }

  if (!runner) return null

  return (
    <Modal title={'Etiqueta Adesiva — ' + runner.name} onClose={onClose} maxWidth={440}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '4px 0' }}>

        {loading ? (
          <p style={{ color: '#64748b', fontWeight: 600, padding: 24 }}>Gerando etiqueta adesiva...</p>
        ) : (
          <>
            {/* Visualização Real do Adesivo Térmico */}
            <div style={{
              background: '#fff',
              padding: 8,
              borderRadius: 14,
              boxShadow: '0 6px 20px rgba(0,0,0,0.14)',
              border: '2px solid #cbd5e1',
              width: '100%',
              maxWidth: 380,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <img
                src={labelDataUrl}
                alt={'Etiqueta de ' + runner.name}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  borderRadius: 6
                }}
              />
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
              ✓ Layout otimizado para rolos de adesivos térmicos de 58mm (8 cm).
            </div>

            <div className="qr-result-actions" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="qr-action-btn qr-action-thermal"
                onClick={handlePrintBt}
                disabled={printingBt}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  height: 44,
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  borderRadius: 10
                }}
              >
                🖨 {printingBt ? 'Enviando...' : 'Imprimir Térmica (Bluetooth)'}
              </button>

              <button
                type="button"
                onClick={handlePrintSystem}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  height: 40,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  borderRadius: 10,
                  background: '#f1f5f9',
                  color: '#1e293b',
                  border: '1.5px solid #cbd5e1',
                  cursor: 'pointer'
                }}
              >
                🧾 Imprimir Adesivo (Sistema / 8 cm)
              </button>

              <a
                className="qr-action-btn qr-action-download active-download-btn"
                href={labelDataUrl}
                download={buildQRFilename(runner)}
                style={{
                  width: '100%',
                  textAlign: 'center',
                  justifyContent: 'center',
                  height: 40,
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  boxShadow: '0 3px 12px rgba(37, 99, 235, 0.3)',
                  border: 'none',
                  textDecoration: 'none'
                }}
              >
                ⬇ Baixar Imagem da Etiqueta (PNG)
              </a>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
