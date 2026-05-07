import type { MetroStation, WikiStationDetails } from '../types.ts'
import { fetchJson } from './http.ts'

function parseYearFromClaims(claims: unknown[] | undefined) {
  const years = (claims ?? [])
    .map((claim) => {
      const time = (claim as { mainsnak?: { datavalue?: { value?: { time?: string } } } })?.mainsnak?.datavalue?.value?.time
      return time ? Number.parseInt(String(time).slice(1, 5), 10) : null
    })
    .filter((year): year is number => Number.isFinite(year))

  return years.length > 0 ? Math.min(...years) : null
}

async function fetchWikipediaExtractByTitle(title: string, chars: number) {
  const url = new URL('https://fr.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('prop', 'extracts')
  url.searchParams.set('explaintext', '1')
  url.searchParams.set('exintro', '1')
  url.searchParams.set('exchars', String(chars))
  url.searchParams.set('redirects', '1')
  url.searchParams.set('titles', title)
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')

  const payload = await fetchJson<{
    query?: {
      pages?: Record<string, { title?: string; extract?: string; missing?: boolean }>
    }
  }>(url)

  const page = Object.values(payload.query?.pages ?? {}).find((entry) => !entry.missing)

  return {
    title: page?.title ?? null,
    extract: page?.extract ?? null,
  }
}

async function searchWikipediaTitle(query: string) {
  const url = new URL('https://fr.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('list', 'search')
  url.searchParams.set('srsearch', query)
  url.searchParams.set('srlimit', '1')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')

  const payload = await fetchJson<{ query?: { search?: Array<{ title: string }> } }>(url)
  return payload.query?.search?.[0]?.title ?? null
}

export async function fetchWikipediaStationInfo(station: MetroStation): Promise<WikiStationDetails> {
  const pageTitle = `${station.name} (métro de Paris)`
  const detailsUrl = new URL('https://fr.wikipedia.org/w/api.php')
  detailsUrl.searchParams.set('action', 'query')
  detailsUrl.searchParams.set('prop', 'pageprops|extracts')
  detailsUrl.searchParams.set('ppprop', 'wikibase_item')
  detailsUrl.searchParams.set('explaintext', '1')
  detailsUrl.searchParams.set('exchars', '1400')
  detailsUrl.searchParams.set('redirects', '1')
  detailsUrl.searchParams.set('titles', pageTitle)
  detailsUrl.searchParams.set('format', 'json')
  detailsUrl.searchParams.set('origin', '*')

  let pagePayload = await fetchJson<{
    query?: {
      pages?: Record<string, { title?: string; missing?: boolean; pageprops?: { wikibase_item?: string }; extract?: string }>
    }
  }>(detailsUrl)

  let page = Object.values(pagePayload.query?.pages ?? {}).find((entry) => !entry.missing)

  if (!page) {
    const searchUrl = new URL('https://fr.wikipedia.org/w/api.php')
    searchUrl.searchParams.set('action', 'query')
    searchUrl.searchParams.set('list', 'search')
    searchUrl.searchParams.set('srsearch', `"${station.name}" "métro de Paris"`)
    searchUrl.searchParams.set('srlimit', '1')
    searchUrl.searchParams.set('format', 'json')
    searchUrl.searchParams.set('origin', '*')

    const searchPayload = await fetchJson<{ query?: { search?: Array<{ title: string }> } }>(searchUrl)
    const fallbackTitle = searchPayload.query?.search?.[0]?.title

    if (fallbackTitle) {
      detailsUrl.searchParams.set('titles', fallbackTitle)
      pagePayload = await fetchJson(detailsUrl)
      page = Object.values(pagePayload.query?.pages ?? {}).find((entry) => !entry.missing)
    }
  }

  if (!page) {
    return {
      constructionYear: null,
      namedAfter: null,
      namedAfterTitle: null,
      namedAfterSummary: null,
      summary: null,
      wikiUrl: null,
    }
  }

  const wikibaseId = page.pageprops?.wikibase_item
  let constructionYear: number | null = null
  let namedAfter: string | null = null
  let namedAfterTitle: string | null = null
  let namedAfterSummary: string | null = null

  if (wikibaseId) {
    const entityUrl = new URL('https://www.wikidata.org/w/api.php')
    entityUrl.searchParams.set('action', 'wbgetentities')
    entityUrl.searchParams.set('ids', wikibaseId)
    entityUrl.searchParams.set('languages', 'fr')
    entityUrl.searchParams.set('format', 'json')
    entityUrl.searchParams.set('origin', '*')

    const entityPayload = await fetchJson<{
      entities?: Record<string, { claims?: Record<string, unknown[]> }>
    }>(entityUrl)

    const entity = entityPayload.entities?.[wikibaseId]
    constructionYear = parseYearFromClaims(entity?.claims?.P1619) ?? parseYearFromClaims(entity?.claims?.P571)

    const namedAfterId = (
      entity?.claims?.P138?.[0] as
        | { mainsnak?: { datavalue?: { value?: { id?: string } } } }
        | undefined
    )?.mainsnak?.datavalue?.value?.id

    if (namedAfterId) {
      const namedAfterUrl = new URL('https://www.wikidata.org/w/api.php')
      namedAfterUrl.searchParams.set('action', 'wbgetentities')
      namedAfterUrl.searchParams.set('ids', namedAfterId)
      namedAfterUrl.searchParams.set('languages', 'fr')
      namedAfterUrl.searchParams.set('format', 'json')
      namedAfterUrl.searchParams.set('origin', '*')

      const namedAfterPayload = await fetchJson<{
        entities?: Record<string, { labels?: { fr?: { value?: string } }; sitelinks?: { frwiki?: { title?: string } } }>
      }>(namedAfterUrl)

      const namedAfterEntity = namedAfterPayload.entities?.[namedAfterId]
      namedAfter = namedAfterEntity?.labels?.fr?.value ?? null

      const namedAfterWikiTitle = namedAfterEntity?.sitelinks?.frwiki?.title
      namedAfterTitle = namedAfterWikiTitle ?? namedAfter

      if (namedAfterWikiTitle) {
        const namedAfterPage = await fetchWikipediaExtractByTitle(namedAfterWikiTitle, 420)
        namedAfterSummary = namedAfterPage.extract
      }
    }
  }

  if (!namedAfterSummary) {
    const exactSubject = await fetchWikipediaExtractByTitle(station.name, 420)
    namedAfterTitle = namedAfterTitle ?? exactSubject.title
    namedAfterSummary = exactSubject.extract

    if (!namedAfterSummary) {
      const fallbackSubjectTitle = await searchWikipediaTitle(`"${station.name}"`)
      if (fallbackSubjectTitle) {
        const fallbackSubject = await fetchWikipediaExtractByTitle(fallbackSubjectTitle, 420)
        namedAfterTitle = namedAfterTitle ?? fallbackSubject.title
        namedAfterSummary = fallbackSubject.extract
      }
    }
  }

  return {
    constructionYear,
    namedAfter,
    namedAfterTitle,
    namedAfterSummary,
    summary: page.extract ?? null,
    wikiUrl: page.title ? `https://fr.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}` : null,
  }
}
