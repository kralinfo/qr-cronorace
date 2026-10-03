import { openDB } from 'idb'

const DB_NAME = 'pwa-qr-timing'
const DB_VERSION = 1
let dbPromise = null

function getDB(){
  if(!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db){
        if(!db.objectStoreNames.contains('runners')) db.createObjectStore('runners', { keyPath:'id' })
        if(!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath:'id' })
      }
    })
  }
  return dbPromise
}

export async function addRunner(runner){
  const db = await getDB()
  await db.put('runners', runner)
  return runner
}

export async function getRunners(){
  const db = await getDB()
  return await db.getAll('runners')
}

export async function getRunnerByToken(token){
  const db = await getDB()
  return await db.get('runners', token)
}

export async function saveRunner(r){ return addRunner(r) }

export async function saveRecord(record){
  const db = await getDB()
  await db.put('records', record)
  return record
}

export async function getRecords(){
  const db = await getDB()
  return await db.getAll('records')
}

export async function exportRecordsCSV(){
  const records = await getRecords()
  const header = ['id','token','runnerName','bib','timestampUTC','device','raw']
  const lines = [header.join(',')]
  for(const r of records){
    const row = header.map(h => {
      const v = r[h] ?? ''
      return '"' + String(v).replace(/"/g,'""') + '"'
    }).join(',')
    lines.push(row)
  }
  const csv = lines.join('\n')
  return new Blob([csv], { type:'text/csv;charset=utf-8;' })
}
