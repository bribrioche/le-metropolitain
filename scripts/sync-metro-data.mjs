import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const OUTPUT_PATH = resolve('public/data/metro-data.json')
const PAGE_LIMIT = 100
const TRAFFIC_YEAR = 2021
const USER_AGENT = 'LeMetropolitain/1.0 data sync'

const LINE_ORDER = ['1', '2', '3', '3bis', '4', '5', '6', '7', '7bis', '8', '9', '10', '11', '12', '13', '14']
const LINE_COLORS = {
  '1': '#ffce00',
  '2': '#0064b0',
  '3': '#9f9825',
  '3bis': '#98d4e2',
  '4': '#c04191',
  '5': '#f28e42',
  '6': '#6ec4e8',
  '7': '#f3a4ba',
  '7bis': '#6eca97',
  '8': '#d5a300',
  '9': '#b6bd00',
  '10': '#c9910d',
  '11': '#704b1c',
  '12': '#007852',
  '13': '#6ec4e8',
  '14': '#6b1f7b',
}

const MANUAL_LINE_FALLBACKS = {
  '7bis': [
    'Bolivar',
    'Botzaris',
    'Buttes Chaumont',
    'Danube',
    'Jaurès',
    'Louis Blanc',
    'Place des Fêtes',
    'Pré-Saint-Gervais',
  ],
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds)
  })
}

async function fetchJson(url, attempt = 0) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  })

  if (response.status === 429 && attempt < 5) {
    const retryAfter = Number(response.headers.get('retry-after') ?? '0')
    const waitTime = retryAfter > 0 ? retryAfter * 1000 : 1000 * (attempt + 1)
    await sleep(waitTime)
    return fetchJson(url, attempt + 1)
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} for ${url}`)
  }

  return response.json()
}

async function fetchAllRecords(baseUrl, where) {
  const results = []
  let offset = 0

  while (true) {
    const url = new URL(baseUrl)
    url.searchParams.set('limit', String(PAGE_LIMIT))
    url.searchParams.set('offset', String(offset))
    if (where) {
      url.searchParams.set('where', where)
    }

    const payload = await fetchJson(url.toString())
    const page = payload.results ?? []
    results.push(...page)

    if (page.length < PAGE_LIMIT) {
      break
    }

    offset += PAGE_LIMIT
  }

  return results
}

function chunk(values, size) {
  const output = []
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size))
  }
  return output
}

function normalizeStationName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function toLineId(value) {
  return String(value).replace(/\s+/g, '').toLowerCase().replace('bis', 'bis')
}

function formatLineLabel(lineId) {
  return lineId.endsWith('bis')
    ? `Ligne ${lineId.slice(0, -3)} bis`
    : `Ligne ${lineId}`
}

function parseYearFromTime(claims = []) {
  const years = claims
    .map((claim) => claim?.mainsnak?.datavalue?.value?.time)
    .filter(Boolean)
    .map((time) => Number.parseInt(String(time).slice(1, 5), 10))
    .filter(Number.isFinite)

  return years.length ? Math.min(...years) : null
}

function extractEntityId(claim) {
  return claim?.mainsnak?.datavalue?.value?.id ?? null
}

function wikiTitleToUrl(title) {
  return title ? `https://fr.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}` : null
}

async function fetchMetroReferenceRecords() {
  return fetchAllRecords(
    'https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/emplacement-des-gares-idf/records',
    'mode="METRO"',
  )
}

async function fetchMetroTrafficRecords() {
  return fetchAllRecords(
    `https://data.ratp.fr/api/explore/v2.1/catalog/datasets/trafic-annuel-entrant-par-station-du-reseau-ferre-${TRAFFIC_YEAR}/records`,
    'reseau="Métro"',
  )
}

async function fetchAccessRelations(zoneIds) {
  const batches = chunk(zoneIds, 80)
  const records = []

  for (const batch of batches) {
    const where = `zdaid in (${batch.map((zoneId) => `"${zoneId}"`).join(',')})`
    const page = await fetchAllRecords(
      'https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/relations-acces/records',
      where,
    )
    records.push(...page)
  }

  return records
}

async function fetchAccessEntries(accessIds) {
  const batches = chunk(accessIds, 80)
  const records = []

  for (const batch of batches) {
    const where = `accid in (${batch.map((accessId) => `"${accessId}"`).join(',')})`
    const page = await fetchAllRecords(
      'https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/acces/records',
      where,
    )
    records.push(...page)
  }

  return records
}

async function fetchWikiCategoryMembers(lineId) {
  const categoryTitle = `Catégorie:Station de la ligne ${lineId.replace('bis', ' bis')} du métro de Paris`
  const pages = []
  let continueToken = null

  do {
    const url = new URL('https://fr.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('list', 'categorymembers')
    url.searchParams.set('cmtitle', categoryTitle)
    url.searchParams.set('cmtype', 'page')
    url.searchParams.set('cmlimit', 'max')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')

    if (continueToken) {
      url.searchParams.set('cmcontinue', continueToken)
    }

    const payload = await fetchJson(url.toString())
    pages.push(...(payload.query?.categorymembers ?? []))
    continueToken = payload.continue?.cmcontinue ?? null
  } while (continueToken)

  return pages
}

async function fetchWikiPageDetails(titles) {
  const pages = []

  for (const batch of chunk(titles, 20)) {
    const url = new URL('https://fr.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('prop', 'pageprops|extracts')
    url.searchParams.set('ppprop', 'wikibase_item')
    url.searchParams.set('exintro', '1')
    url.searchParams.set('explaintext', '1')
    url.searchParams.set('redirects', '1')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')
    url.searchParams.set('titles', batch.join('|'))

    const payload = await fetchJson(url.toString())
    pages.push(...Object.values(payload.query?.pages ?? {}))
  }

  return pages
}

async function fetchWikidataEntities(entityIds) {
  const entityMap = new Map()

  for (const batch of chunk(entityIds, 50)) {
    const url = new URL('https://www.wikidata.org/w/api.php')
    url.searchParams.set('action', 'wbgetentities')
    url.searchParams.set('ids', batch.join('|'))
    url.searchParams.set('languages', 'fr')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')

    const payload = await fetchJson(url.toString())

    for (const [entityId, entity] of Object.entries(payload.entities ?? {})) {
      entityMap.set(entityId, entity)
    }
  }

  return entityMap
}

async function fetchWikiEnrichment() {
  const pageEntries = []

  for (const lineId of LINE_ORDER) {
    const categoryMembers = await fetchWikiCategoryMembers(lineId)
    pageEntries.push(
      ...categoryMembers.map((page) => ({
        lineId,
        title: page.title,
      })),
    )
  }

  const pageDetails = await fetchWikiPageDetails(pageEntries.map((entry) => entry.title))
  const pageByTitle = new Map(pageDetails.map((page) => [page.title, page]))
  const wikidataIds = pageDetails
    .map((page) => page.pageprops?.wikibase_item)
    .filter(Boolean)

  const entityMap = await fetchWikidataEntities(wikidataIds)
  const namedAfterIds = [...new Set(
    [...entityMap.values()]
      .flatMap((entity) => entity.claims?.P138 ?? [])
      .map(extractEntityId)
      .filter(Boolean),
  )]
  const namedAfterEntityMap = await fetchWikidataEntities(namedAfterIds)

  const enrichment = new Map()

  for (const entry of pageEntries) {
    const page = pageByTitle.get(entry.title)
    if (!page) {
      continue
    }

    const entityId = page.pageprops?.wikibase_item
    const entity = entityId ? entityMap.get(entityId) : null
    const namedAfterId = entity?.claims?.P138?.[0] ? extractEntityId(entity.claims.P138[0]) : null
    const namedAfterLabel = namedAfterId
      ? namedAfterEntityMap.get(namedAfterId)?.labels?.fr?.value ?? null
      : null

    const lineKey = `${entry.lineId}::${normalizeStationName(entry.title.replace(/\s+\(métro de Paris\)$/i, ''))}`

    enrichment.set(lineKey, {
      wikiTitle: page.title,
      wikiUrl: wikiTitleToUrl(page.title),
      summary: page.extract ?? null,
      constructionYear: parseYearFromTime(entity?.claims?.P1619) ?? parseYearFromTime(entity?.claims?.P571),
      namedAfter: namedAfterLabel,
    })
  }

  return enrichment
}

function createOriginText(namedAfter, summary) {
  if (namedAfter) {
    return `Le nom de la station renvoie a ${namedAfter}.`
  }

  if (summary) {
    const firstSentence = summary.split('. ')[0]?.trim()
    return firstSentence ? `${firstSentence}.` : null
  }

  return null
}

async function main() {
  const [referenceRecords, trafficRecords] = await Promise.all([
    fetchMetroReferenceRecords(),
    fetchMetroTrafficRecords(),
  ])

  const trafficByStation = new Map(
    trafficRecords.map((record) => [normalizeStationName(record.station), record]),
  )

  const zoneIds = [...new Set(referenceRecords.map((record) => String(record.id_ref_zda)))]
  const accessRelations = await fetchAccessRelations(zoneIds)
  const accessIds = [...new Set(accessRelations.map((record) => record.accid))]
  const accessEntries = await fetchAccessEntries(accessIds)

  const accessById = new Map(accessEntries.map((record) => [record.accid, record]))
  const exitCountsByZoneId = new Map()

  for (const relation of accessRelations) {
    const access = accessById.get(relation.accid)
    const isExit = String(access?.accisexit).toLowerCase() === 'true'
    if (!isExit) {
      continue
    }

    const zoneId = String(relation.zdaid)
    exitCountsByZoneId.set(zoneId, (exitCountsByZoneId.get(zoneId) ?? 0) + 1)
  }

  const uniqueReferenceRecords = [...new Map(
    referenceRecords.map((record) => [`${toLineId(record.indice_lig)}::${normalizeStationName(record.nom_gares)}`, record]),
  ).values()]

  const stations = uniqueReferenceRecords
    .map((record) => {
      const lineId = toLineId(record.indice_lig)
      const normalizedStationName = normalizeStationName(record.nom_gares)
      const traffic = trafficByStation.get(normalizedStationName)
      const stationId = `${lineId}--${normalizedStationName.replaceAll(' ', '-')}`

      return {
        id: stationId,
        lineId,
        lineLabel: formatLineLabel(lineId),
        lineColor: LINE_COLORS[lineId] ?? '#444444',
        linePictoUrl: record.picto?.url ?? null,
        name: record.nom_gares,
        municipality: traffic?.ville ?? record.nom_zdc ?? null,
        arrondissement: traffic?.arrondissement_pour_paris ?? null,
        stopZoneId: String(record.id_ref_zda),
        annualPassengers: traffic?.trafic ?? null,
        annualPassengersYear: traffic ? TRAFFIC_YEAR : null,
        exitCount: exitCountsByZoneId.get(String(record.id_ref_zda)) ?? null,
        constructionYear: null,
        namedAfter: null,
        originText: null,
        summary: null,
        wikiUrl: null,
        latitude: record.geo_point_2d?.lat ?? null,
        longitude: record.geo_point_2d?.lon ?? null,
      }
    })
    .sort((left, right) => {
      const lineOrder = LINE_ORDER.indexOf(left.lineId) - LINE_ORDER.indexOf(right.lineId)
      if (lineOrder !== 0) {
        return lineOrder
      }

      return left.name.localeCompare(right.name, 'fr')
    })

  for (const [lineId, stationNames] of Object.entries(MANUAL_LINE_FALLBACKS)) {
    const alreadyPresent = stations.some((station) => station.lineId === lineId)
    if (alreadyPresent) {
      continue
    }

    for (const stationName of stationNames) {
      const traffic = trafficByStation.get(normalizeStationName(stationName))
      stations.push({
        id: `${lineId}--${normalizeStationName(stationName).replaceAll(' ', '-')}`,
        lineId,
        lineLabel: formatLineLabel(lineId),
        lineColor: LINE_COLORS[lineId] ?? '#444444',
        linePictoUrl: null,
        name: stationName,
        municipality: traffic?.ville ?? 'Paris',
        arrondissement: traffic?.arrondissement_pour_paris ?? null,
        stopZoneId: 'manual-fallback',
        annualPassengers: traffic?.trafic ?? null,
        annualPassengersYear: traffic ? TRAFFIC_YEAR : null,
        exitCount: null,
        constructionYear: null,
        namedAfter: null,
        originText: null,
        summary: null,
        wikiUrl: null,
        latitude: null,
        longitude: null,
      })
    }
  }

  stations.sort((left, right) => {
    const lineOrder = LINE_ORDER.indexOf(left.lineId) - LINE_ORDER.indexOf(right.lineId)
    if (lineOrder !== 0) {
      return lineOrder
    }

    return left.name.localeCompare(right.name, 'fr')
  })

  const lines = LINE_ORDER
    .map((lineId) => {
      const lineStations = stations.filter((station) => station.lineId === lineId)
      if (lineStations.length === 0) {
        return null
      }

      return {
        id: lineId,
        label: formatLineLabel(lineId),
        color: LINE_COLORS[lineId] ?? '#444444',
        linePictoUrl: lineStations.find((station) => station.linePictoUrl)?.linePictoUrl ?? null,
        stationCount: lineStations.length,
        stations: lineStations.map((station) => station.id),
      }
    })
    .filter(Boolean)

  const payload = {
    generatedAt: new Date().toISOString(),
    appName: 'Le Metropolitain',
    trafficYear: TRAFFIC_YEAR,
    sources: {
      metroStations:
        'https://data.iledefrance-mobilites.fr/explore/dataset/emplacement-des-gares-idf/',
      stopAccess:
        'https://data.iledefrance-mobilites.fr/explore/dataset/acces/',
      stopAccessRelations:
        'https://data.iledefrance-mobilites.fr/explore/dataset/relations-acces/',
      traffic:
        `https://data.ratp.fr/explore/dataset/trafic-annuel-entrant-par-station-du-reseau-ferre-${TRAFFIC_YEAR}/`,
      wikipedia: 'https://fr.wikipedia.org/',
      wikidata: 'https://www.wikidata.org/',
    },
    lines,
    stations,
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(`Generated ${stations.length} stations across ${lines.length} metro lines -> ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
