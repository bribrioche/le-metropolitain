import type { MetroLine, MetroStation } from '../types.ts'

const numberFormatter = new Intl.NumberFormat('fr-FR')
export const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
})

export function formatPassengers(station: MetroStation) {
  if (!station.annualPassengers || !station.annualPassengersYear) {
    return 'Non documenté'
  }

  return `${numberFormatter.format(station.annualPassengers)} entrées (${station.annualPassengersYear})`
}

export function formatLocation(station: MetroStation) {
  if (station.arrondissement) {
    return `Paris ${station.arrondissement}e`
  }

  return station.municipality ?? 'Île-de-France'
}

export function renderLineIcon(line: MetroLine, escapeHtml: (value: string) => string) {
  if (line.linePictoUrl) {
    return `<img class="line-picto" src="${line.linePictoUrl}" alt="Picto officiel ${escapeHtml(line.label)}">`
  }

  return `<span class="line-marker" style="--line-color:${line.color};">${escapeHtml(line.id)}</span>`
}
