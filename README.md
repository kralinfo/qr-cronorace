# PWA QR Timing (offline-first)

Este é um esqueleto de PWA para registro de leituras de QR (dorsais). O app é offline-first: gera/ armazena leituras localmente no IndexedDB e permite exportar CSV.

## Quick start

1. Instale dependências:

```bash
npm install
```

2. Rode em desenvolvimento:

```bash
npm run dev
```

3. Abra http://localhost:5173 no seu navegador (ou o endereço que o Vite mostrar).

## Fluxo básico

- `Admin` — cadastrar corredor e gerar QR (salve a imagem para imprimir no dorsal).
- `Scanner` — abrir no celular, apontar a câmera para o QR; leituras são salvas localmente.
- `Exportar CSV` — exporta todas as leituras do dispositivo.

## Deploy

- Suba para Vercel ou Netlify como site estático (rodando `npm run build`, pasta de saída `dist`).

## Observações e próximos passos

- Atualmente as leituras ficam apenas no dispositivo (IndexedDB). É possível adicionar funções serverless para centralizar leituras e usar timestamp do servidor.
- Teste em campo (iOS/Android) antes do uso em evento real; iOS PWAs possuem limitações de câmera e service worker — há fallback por upload de imagem.
