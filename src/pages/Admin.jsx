import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { addRunner, getRunners, exportRecordsCSV } from '../lib/storage'

export default function Admin(){
  const [name, setName] = useState('')
  const [bib, setBib] = useState('')
  const [runners, setRunners] = useState([])
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [recordsCsvUrl, setRecordsCsvUrl] = useState(null)

  useEffect(()=>{ loadRunners() },[])

  async function loadRunners(){
    setRunners(await getRunners())
  }

  async function createRunner(e){
    e.preventDefault()
    const token = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2,6)
    const r = { id: token, token, name, bib }
    await addRunner(r)
    await loadRunners()
    setName(''); setBib('')
    const url = `${location.origin}/?token=${token}`
    const qr = await QRCode.toDataURL(url, { errorCorrectionLevel: 'Q', margin:2, scale:6 })
    setQrDataUrl(qr)
    alert('Corredor criado. Salve o QR para impressão.')
  }

  async function doExport(){
    const blob = await exportRecordsCSV()
    const url = URL.createObjectURL(blob)
    setRecordsCsvUrl(url)
  }

  return (
    <div className="admin">
      <section className="form">
        <h2>Adicionar corredor</h2>
        <form onSubmit={createRunner}>
          <input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} required/>
          <input placeholder="Bib" value={bib} onChange={e=>setBib(e.target.value)} required/>
          <button type="submit">Criar + Gerar QR</button>
        </form>
        {qrDataUrl && (
          <div>
            <p>QR gerado (salve/imprima):</p>
            <img src={qrDataUrl} alt="QR" style={{width:200}} />
            <a href={qrDataUrl} download="bib-qr.png">Baixar PNG</a>
          </div>
        )}
      </section>

      <section className="lists">
        <h3>Runners cadastrados</h3>
        <ul>
          {runners.map(r => <li key={r.id}>{r.name} — {r.bib} — token: {r.token}</li>)}
        </ul>
        <h3>Exportar registros</h3>
        <button onClick={doExport}>Exportar CSV</button>
        {recordsCsvUrl && <a href={recordsCsvUrl} download="records.csv">Baixar CSV</a>}
      </section>
    </div>
  )
}
