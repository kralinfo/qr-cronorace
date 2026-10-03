import React, { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { saveRecord, getRunnerByToken } from '../lib/storage'

export default function Scanner(){
  const videoRef = useRef(null)
  const [msg, setMsg] = useState('Aponte a câmera para o QR')
  const [scanning, setScanning] = useState(false)
  const codeReaderRef = useRef(null)

  useEffect(() => {
    return () => stopScanner()
  }, [])

  const startScanner = async () => {
    setMsg('Iniciando câmera...')
    setScanning(true)
    const codeReader = new BrowserMultiFormatReader()
    codeReaderRef.current = codeReader
    try {
      await codeReader.decodeFromVideoDevice(null, videoRef.current, async (result, err) => {
        if (result) {
          codeReader.reset()
          handleResult(result.getText())
          setTimeout(() => {
            if (scanning && codeReaderRef.current) {
              codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, (r,e)=>{})
            }
          }, 900)
        }
      })
      setMsg('Pronto — lendo QR...')
    } catch(e){
      console.error(e)
      setMsg('Erro ao acessar câmera. Use o botão abaixo para enviar imagem.')
      setScanning(false)
    }
  }

  const stopScanner = () => {
    setScanning(false)
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset() } catch(e){}
      codeReaderRef.current = null
    }
  }

  const handleResult = async (text) => {
    setMsg('QR lido: ' + text)
    let payload = null
    try {
      if (text.startsWith('http')) {
        const parts = text.split('/')
        const token = parts.pop() || parts.pop()
        payload = { type: 'token', token }
      } else {
        payload = JSON.parse(text)
      }
    } catch (e) {
      payload = { raw: text }
    }

    const runner = payload.token ? await getRunnerByToken(payload.token) : null
    const data = {
      id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
      token: payload.token || null,
      raw: payload.raw || null,
      runnerName: runner?.name || (payload.name ?? null),
      bib: runner?.bib || (payload.bib ?? null),
      timestampUTC: new Date().toISOString(),
      device: navigator.userAgent
    }
    await saveRecord(data)
    setMsg('Registrado: ' + (data.runnerName || data.bib || data.token || 'OK'))
  }

  return (
    <div className="scanner">
      <div className="video-wrap">
        <video ref={videoRef} muted playsInline style={{width:'100%',height:'100%'}}/>
        <div className="reticle">⊞</div>
      </div>
      <div className="controls">
        {!scanning ? (
          <button onClick={startScanner}>Iniciar Câmera</button>
        ) : (
          <button onClick={stopScanner}>Parar</button>
        )}
        <p>{msg}</p>
        <label className="file-label">Ou enviar imagem:
          <input type="file" accept="image/*" onChange={async e=>{
            const file = e.target.files?.[0]; if(!file) return;
            const text = 'uploaded:' + file.name
            await saveRecord({ id: 'r_'+Date.now(), raw: text, timestampUTC: new Date().toISOString(), device: 'file-upload' })
            setMsg('Imagem salva como registro (sem decodificação local).')
          }}/>
        </label>
      </div>
    </div>
  )
}
