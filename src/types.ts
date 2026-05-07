export type MetroStation = {
  id: string
  lineId: string
  lineLabel: string
  lineColor: string
  linePictoUrl?: string | null
  name: string
  municipality: string | null
  arrondissement: number | null
  stopZoneId: string
  annualPassengers: number | null
  annualPassengersYear: number | null
  exitCount: number | null
  constructionYear: number | null
  summary: string | null
  wikiUrl: string | null
  latitude: number | null
  longitude: number | null
}

export type MetroLine = {
  id: string
  label: string
  color: string
  linePictoUrl?: string | null
  stationCount: number
  stations: string[]
}

export type MetroData = {
  generatedAt: string
  appName: string
  trafficYear: number
  sources: Record<string, string>
  lines: MetroLine[]
  stations: MetroStation[]
}

export type WikiStationDetails = {
  constructionYear: number | null
  namedAfter: string | null
  namedAfterTitle: string | null
  namedAfterSummary: string | null
  summary: string | null
  wikiUrl: string | null
}

export type WikiStatus = 'idle' | 'loading' | 'ready' | 'error'
