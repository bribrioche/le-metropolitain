import type { MetroData } from '../types.ts'

export async function loadData() {
  const response = await fetch('/data/metro-data.json')

  if (!response.ok) {
    throw new Error(`Impossible de charger les données : ${response.status}`)
  }

  return response.json() as Promise<MetroData>
}
