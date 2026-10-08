// Responsabilidade única: configuração central do banco IndexedDB (schema único e compartilhado).
import { openDB } from 'idb'

export const DB_NAME = 'pwa-qr-timing'
export const DB_VERSION = 3

export const STORES = {
  races: 'races',
  results: 'results',
  runners: 'runners'
}

let dbPromise = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.races)) {
          db.createObjectStore(STORES.races, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORES.results)) {
          db.createObjectStore(STORES.results, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORES.runners)) {
          db.createObjectStore(STORES.runners, { keyPath: 'id' })
        }
      }
    })
  }
  return dbPromise
}

