import React, { useState } from 'react'

export default function ChronometerPage() {
  const [tab, setTab] = useState('MASC')
  const rows = [
    { geral: 1, cat: 'M', num: '0005', posCat: 1, tempo: '00:12:34.560' },
    { geral: 2, cat: 'F', num: '0002', posCat: 1, tempo: '00:13:01.220' }
  ]

  return (
    <div className="chrono-page">
      <header className="chrono-header">
        <span className="chrono-brand">JANELAMARCA</span>
        <span className="chrono-status">AGUARDANDO</span>
      </header>
      <main className="chrono-main">
        <div className="chrono-time">00:00:00.000</div>
        <button type="button" className="chrono-start-btn">INICIAR</button>

        <section className="chrono-panel">
          <div className="chrono-tabs">
            <button className={tab === 'MASC' ? 'active' : ''} onClick={() => setTab('MASC')}>MASC</button>
            <button className={tab === 'FEM' ? 'active' : ''} onClick={() => setTab('FEM')}>FEM</button>
          </div>
          <div className="chrono-input-row">
            <input placeholder="Nº peito" />
            <button type="button" className="chrono-check-btn">✓</button>
          </div>
        </section>

        <section className="chrono-table-wrap">
          <table className="chrono-table">
            <thead>
              <tr>
                <th>GERAL</th><th>CAT.</th><th>Nº</th><th>POS. CAT.</th><th>TEMPO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.geral}</td><td>{r.cat}</td><td>{r.num}</td><td>{r.posCat}</td><td>{r.tempo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="chrono-footer">
          <button type="button" className="chrono-btn end">ENCERRAR</button>
          <button type="button" className="chrono-btn reset">Reiniciar</button>
        </footer>
      </main>
    </div>
  )
}
