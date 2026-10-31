import React, { useState } from 'react';

export function CadastroCorredores() {
  const [activeTab, setActiveTab] = useState<'masculino' | 'feminino'>('masculino');

  return (
    <div className="w-full bg-[#13091e] rounded-xl border border-purple-900/40 overflow-hidden shadow-lg">
      
      {/* 1. NAVEGAÇÃO POR ABAS (TABS NO TOPO DO CARD) */}
      <div className="flex w-full bg-[#0b0213] border-b border-purple-900/40">
        <button
          type="button"
          onClick={() => setActiveTab('masculino')}
          className={"flex-1 py-3 text-center text-xs font-bold uppercase transition-all " + (
            activeTab === 'masculino'
              ? 'bg-[#13091e] text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-white'
          )}
        >
          • Masculino
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('feminino')}
          className={"flex-1 py-3 text-center text-xs font-bold uppercase transition-all " + (
            activeTab === 'feminino'
              ? 'bg-[#13091e] text-pink-400 border-b-2 border-pink-400'
              : 'text-gray-400 hover:text-white'
          )}
        >
          • Feminino
        </button>
      </div>

      {/* 2. CONTEÚDO CONDICIONAL (REDUZ O TAMANHO DA TELA PELA METADE) */}
      <div className="p-4 space-y-4">
        {/* FORMULÁRIO */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder={activeTab === 'masculino' ? "Nome do corredor" : "Nome da corredora"}
            className="w-full h-10 px-3 bg-[#0b0213] border border-purple-900/60 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />

          <input
            type="number"
            placeholder="Nº"
            className="w-full h-10 px-3 bg-[#0b0213] border border-purple-900/60 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />

          {/* BADGES / TAGS */}
          <div className="flex gap-2">
            <button type="button" className="px-3 py-1 bg-[#1c0d2e] border border-purple-800/40 rounded text-xs text-gray-300">Local</button>
            <button type="button" className="px-3 py-1 bg-[#1c0d2e] border border-purple-800/40 rounded text-xs text-gray-300">PCD</button>
            <button type="button" className="px-3 py-1 bg-[#1c0d2e] border border-purple-800/40 rounded text-xs text-gray-300">60</button>
          </div>

          <button
            type="button"
            className="w-full h-10 bg-purple-900/40 hover:bg-purple-800/60 border-0 rounded-md px-4 py-2 text-sm font-medium text-cyan-400 transition-colors">
            Cadastrar
          </button>
        </div>

        {/* LISTA DE CADASTROS (COM ROLAGEM INTERNA) */}
        <div className="space-y-2 max-h-40 overflow-auto">
          {activeTab === 'masculino' ? (
            <div>
              <p className="text-xs text-gray-400">Corredores Masculinos Cadastrados: {maleRunners.length}</p>
              {maleRunners.length > 0 && maleRunners.map(r => (
                <div key={r.id} className="flex items-center justify-between p-2 bg-[#0b0213] rounded-md">
                  <span>{r.number || '—'}</span>
                  <button className="text-xs text-purple-400 hover:underline">Ver QR</button>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-400">Corredoras Femininas Cadastradas: {femaleRunners.length}</p>
              {femaleRunners.length > 0 && femaleRunners.map(r => (
                <div key={r.id} className="flex items-center justify-between p-2 bg-[#0b0213] rounded-md">
                  <span>{r.number || '—'}</span>
                  <button className="text-xs text-pink-400 hover:underline">Ver QR</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
