// UI only: campo somente-leitura com botão para copiar o valor para a área de transferência.
import React, { useState } from 'react'
import { copyToClipboard } from '../../shared/clipboard.service.js'
import { IconCheck, IconCopy } from '../../shared/Icons.jsx'

/** @param {{ label: string, value: string }} props */
export default function CopyableField({ label, value }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(value)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="copyable-field">
      <label>{label}</label>
      <div className="copyable-field-row">
        <input readOnly value={value} onFocus={e => e.target.select()} />
        <button
          type="button"
          className="copy-btn"
          onClick={handleCopy}
          title={copied ? 'Copiado!' : 'Copiar'}
        >
          {copied ? <><IconCheck size={14} color="#34c759" /> Copiado</> : <IconCopy size={18} color="#34c759" />}
        </button>
      </div>
    </div>
  )
}
