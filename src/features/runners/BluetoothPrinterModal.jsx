// UI only: modal para pareamento, gerenciamento e teste de impressora térmica Bluetooth (POS ESC/POS).
import React, { useEffect, useState } from 'react'
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getPrinterStatus,
  isBluetoothSupported,
  printTestToBluetooth,
  subscribePrinterStatus
} from './bluetooth-printer.service.js'

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void
 * }} props
 */
export default function BluetoothPrinterModal({ isOpen, onClose }) {
  const [status, setStatus] = useState(getPrinterStatus())
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const supported = isBluetoothSupported()

  useEffect(() => {
    if (!isOpen) {
      setFeedback(null)
      return
    }
    const unsubscribe = subscribePrinterStatus(setStatus)
    return unsubscribe
  }, [isOpen])

  if (!isOpen) return null

  const handleConnect = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      const res = await connectBluetoothPrinter()
      setFeedback({ type: 'success', message: `Conectado com sucesso à ${res.deviceName}!` })
    } catch (err) {
      if (err.name === 'NotFoundError' || err.message?.includes('User cancelled')) {
        setFeedback({ type: 'info', message: 'Seleção de impressora cancelada.' })
      } else if (err.message === 'NO_WRITE_CHARACTERISTIC_FOUND') {
        setFeedback({ type: 'error', message: 'Impressora conectada, mas não foi encontrado canal de impressão ESC/POS compatível.' })
      } else {
        setFeedback({ type: 'error', message: `Erro ao conectar: ${err.message || 'Verifique se a impressora está ligada e o Bluetooth ativo.'}` })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    disconnectBluetoothPrinter()
    setFeedback({ type: 'info', message: 'Impressora desconectada.' })
  }

  const handleTestPrint = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      await printTestToBluetooth()
      setFeedback({ type: 'success', message: 'Cupom de teste enviado para a impressora!' })
    } catch (err) {
      setFeedback({ type: 'error', message: `Falha ao imprimir teste: ${err.message || 'Erro de comunicação.'}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="confirm-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="printer-modal" onClick={e => e.stopPropagation()}>
        <div className="printer-modal-header">
          <div>
            <h2>Impressora Térmica Bluetooth</h2>
            <p className="printer-modal-subtitle">Conexão direta com mini impressoras de cupom (58mm / 80mm ESC/POS)</p>
          </div>
          <button type="button" className="menu-close-btn" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="printer-modal-body">
          {!supported ? (
            <div className="printer-unsupported-box">
              <p>⚠️ <strong>Conexão direta Web Bluetooth indisponível neste navegador ou endereço.</strong></p>
              <p>
                Os navegadores exigem <strong>conexão segura HTTPS</strong> (ex: <code>https://...</code>) e o navegador <strong>Google Chrome</strong> no Android para liberar a busca direta por dispositivos Bluetooth BLE.
              </p>
              <div style={{ marginTop: '10px', padding: '10px', background: '#e3f2fd', borderRadius: '8px', color: '#0d47a1', fontSize: '0.9rem' }}>
                <strong>💡 Como imprimir pelo celular agora:</strong>
                <p style={{ margin: '6px 0 0' }}>
                  Utilize o botão <strong>"📄 Imprimir Cupom Sistema"</strong>. Ele abre o diálogo de impressão nativo do celular/Android e envia o cupom diretamente para a sua mini impressora térmica pareada.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className={`printer-status-card ${status.connected ? 'connected' : 'disconnected'}`}>
                <div className="printer-status-indicator">
                  <span className={`status-dot ${status.connected ? 'green' : 'gray'}`} />
                  <strong>
                    {status.connected
                      ? `Conectada: ${status.deviceName}`
                      : 'Nenhuma impressora Bluetooth conectada'}
                  </strong>
                </div>
                <p className="printer-status-help">
                  {status.connected
                    ? 'Pronta para imprimir QR codes instantaneamente sem diálogos adicionais.'
                    : 'Ligue a sua mini impressora térmica e clique no botão abaixo para parear.'}
                </p>
              </div>

              {feedback && (
                <div className={`printer-feedback-box ${feedback.type}`}>
                  {feedback.message}
                </div>
              )}

              <div className="printer-modal-actions">
                {!status.connected ? (
                  <button
                    type="button"
                    className="printer-connect-btn"
                    onClick={handleConnect}
                    disabled={loading}
                  >
                    {loading ? 'Buscando impressoras...' : '🔍 Conectar Impressora Bluetooth'}
                  </button>
                ) : (
                  <div className="printer-connected-actions">
                    <button
                      type="button"
                      className="print-btn"
                      onClick={handleTestPrint}
                      disabled={loading}
                    >
                      {loading ? 'Imprimindo...' : '🖨️ Imprimir Cupom de Teste'}
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={handleDisconnect}
                      disabled={loading}
                    >
                      Desconectar
                    </button>
                  </div>
                )}
              </div>

              <div className="printer-help-guide">
                <h4>ℹ️ Instruções para impressora térmica de cupom:</h4>
                <ul>
                  <li>Ligue a impressora e verifique se o LED de Bluetooth está piscando/ativo.</li>
                  <li>Modelos comuns suportados: POS-58, MPT-II, Goojprt, PeriPage, Mini POS 58mm/80mm.</li>
                  <li>Ao cadastrar ou selecionar um corredor, basta tocar em <strong>"Imprimir na Térmica"</strong> para imprimir o cupom físico com o QR Code nítido na hora.</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="runner-history-footer">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
