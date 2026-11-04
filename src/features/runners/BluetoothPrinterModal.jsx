// UI only: modal para pareamento, gerenciamento e teste de impressora térmica Bluetooth (POS ESC/POS).
import React, { useEffect, useState } from 'react'
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getPrinterStatus,
  isBluetoothSupported,
  printTestToBluetooth,
  printCalibrationTestToBluetooth,
  subscribePrinterStatus
} from './bluetooth-printer.service.js'
import {
  getThermalLabelSettings,
  saveThermalLabelSettings,
  subscribeThermalLabelSettings
} from './thermal-label-settings.service.js'
import { IconClose, IconBluetooth, IconPrinter, IconSearch } from '../../shared/Icons.jsx'

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
  const [labelSettings, setLabelSettings] = useState(getThermalLabelSettings())
  const supported = isBluetoothSupported()

  useEffect(() => {
    const unsub = subscribeThermalLabelSettings(setLabelSettings)
    return unsub
  }, [])

  const handleUpdateSetting = (patch) => {
    const updated = saveThermalLabelSettings(patch)
    setLabelSettings(updated)
  }

  const handleTestCalibration = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      await printCalibrationTestToBluetooth()
      setFeedback({ type: 'success', message: '2 etiquetas de calibração enviadas! Verifique se a impressão alinhou perfeitamente com os adesivos.' })
    } catch (err) {
      setFeedback({ type: 'error', message: `Falha ao imprimir teste: ${err.message || 'Erro de comunicação.'}` })
    } finally {
      setLoading(false)
    }
  }

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
          <button type="button" className="menu-close-btn" onClick={onClose} aria-label="Fechar"><IconClose size={16} /></button>
        </div>

        <div className="printer-modal-body">
          {!supported ? (
            <div className="printer-unsupported-box">
              <p><strong>Conexão direta Web Bluetooth indisponível neste navegador.</strong></p>
              <p>
                No <strong>Apple iOS (iPhone e iPad)</strong>, o Safari e o Chrome não suportam a Web Bluetooth API por limitações da própria Apple (WebKit). No <strong>Android</strong> e computadores, o Google Chrome oferece suporte completo com HTTPS.
              </p>
              <div style={{ marginTop: '10px', padding: '10px', background: '#e3f2fd', borderRadius: '8px', color: '#0d47a1', fontSize: '0.9rem' }}>
                <strong>Como imprimir no iPhone / iOS:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                  <li><strong>Opção 1 (Recomendada):</strong> Ao clicar em imprimir, o sistema abre diretamente o cupom térmico (58mm) no diálogo de impressão do iOS, imprimindo na sua impressora conectada.</li>
                  <li><strong>Opção 2 (Bluetooth Direto no iOS):</strong> Acesse este app pelo navegador gratuito <strong>Bluefy (Web BLE Browser)</strong>, disponível na App Store do iPhone, que ativa o suporte a Web Bluetooth no iOS.</li>
                </ul>
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
                    {loading ? 'Buscando impressoras...' : <><IconSearch size={15} /> Conectar Impressora Bluetooth</>}
                  </button>
                ) : (
                  <div className="printer-connected-actions">
                    <button
                      type="button"
                      className="print-btn"
                      onClick={handleTestPrint}
                      disabled={loading}
                    >
                      {loading ? 'Imprimindo...' : <><IconPrinter size={15} /> Imprimir Cupom de Teste</>}
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

              {/* Painel de Calibração da Etiqueta Adesiva */}
              <div className="printer-label-calibration-box">
                <div className="printer-calibration-header">
                  <div>
                    <h4>⚙️ Calibração do Adesivo (80 x 50 mm)</h4>
                    <p>Ajuste milimétrico do vão entre adesivos para evitar deslocamento cumulativo no lote.</p>
                  </div>
                </div>

                <div className="printer-calibration-grid">
                  <div className="calibration-field">
                    <label>Largura do Adesivo</label>
                    <div className="calibration-value-badge">50 mm (Bobina 55mm)</div>
                  </div>

                  <div className="calibration-field">
                    <label>Comprimento do Adesivo</label>
                    <div className="calibration-value-badge">80 mm</div>
                  </div>

                  <div className="calibration-field">
                    <label>Espaço entre Adesivos (GAP)</label>
                    <div className="calibration-stepper">
                      <button
                        type="button"
                        onClick={() => handleUpdateSetting({ gapMm: Math.max(0, Number((labelSettings.gapMm - 0.5).toFixed(1))) })}
                        title="Diminuir 0.5mm"
                      >
                        -
                      </button>
                      <span>{labelSettings.gapMm} mm</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateSetting({ gapMm: Number((labelSettings.gapMm + 0.5).toFixed(1)) })}
                        title="Aumentar 0.5mm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                                    <div className="calibration-field">
                    <label>Ajuste Fino de Avanço</label>
                    <div className="calibration-stepper">
                      <button
                        type="button"
                        onClick={() => handleUpdateSetting({ feedAdjustMm: Number((labelSettings.feedAdjustMm - 0.5).toFixed(1)) })}
                        title="Avançar menos (-0.5mm)"
                      >
                        -
                      </button>
                      <span className={labelSettings.feedAdjustMm > 0 ? 'text-pos' : labelSettings.feedAdjustMm < 0 ? 'text-neg' : ''}>
                        {labelSettings.feedAdjustMm > 0 ? `+${labelSettings.feedAdjustMm}` : labelSettings.feedAdjustMm} mm
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateSetting({ feedAdjustMm: Number((labelSettings.feedAdjustMm + 0.5).toFixed(1)) })}
                        title="Avançar mais (+0.5mm)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="calibration-quick-buttons">
                  <span className="quick-label">Avanço rápido:</span>
                  <button type="button" onClick={() => handleUpdateSetting({ feedAdjustMm: Number((labelSettings.feedAdjustMm + 1.0).toFixed(1)) })}>+1 mm</button>
                  <button type="button" onClick={() => handleUpdateSetting({ feedAdjustMm: Number((labelSettings.feedAdjustMm + 2.0).toFixed(1)) })}>+2 mm</button>
                  <button type="button" onClick={() => handleUpdateSetting({ feedAdjustMm: Number((labelSettings.feedAdjustMm + 3.0).toFixed(1)) })}>+3 mm</button>
                  <button type="button" className="quick-btn-reset" onClick={() => handleUpdateSetting({ feedAdjustMm: 0 })}>Zerar</button>
                </div>

                <div className="printer-calibration-actions">
                  <button
                    type="button"
                    className="calibration-test-btn"
                    onClick={handleTestCalibration}
                    disabled={loading || !status.connected}
                    title={!status.connected ? 'Conecte a impressora primeiro' : 'Imprime 2 etiquetas sequenciais para conferir o picote'}
                  >
                    🏷️ Imprimir 2 Etiquetas de Teste (Conferir Alinhamento)
                  </button>
                </div>

                <p className="calibration-tip">
                  💡 <strong>Como calibrar:</strong> Imprima o teste de 2 etiquetas. Se o segundo adesivo começar um pouco adiantado (já dentro do adesivo), diminua o ajuste fino em <strong>-1 mm</strong>. Se ficar recuado antes do corte, aumente em <strong>+1 mm</strong>.
                </p>
              </div>

              <div className="printer-help-guide">
                <h4>Instruções para impressora térmica de cupom:</h4>
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
