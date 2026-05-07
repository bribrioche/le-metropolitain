import type { MetroData, MetroStation, WikiStationDetails, WikiStatus } from '../types.ts'
import { fetchWikipediaStationInfo } from '../services/wikipedia.ts'
import { formatLocation, formatPassengers, renderLineIcon } from '../utils/format.ts'
import { escapeHtml, extractSentences } from '../utils/text.ts'
import { renderAppShell } from './template.ts'

type AppElements = {
  lineList: HTMLDivElement
  stationsTitle: HTMLHeadingElement
  stationList: HTMLDivElement
  detailPanel: HTMLElement
}

export function renderMetroApp(app: HTMLDivElement, data: MetroData) {
  const stationsById = new Map(data.stations.map((station) => [station.id, station]))
  const linesById = new Map(data.lines.map((line) => [line.id, line]))
  const wikiCache = new Map<string, WikiStationDetails>()
  const wikiStatus = new Map<string, WikiStatus>()

  let selectedLineId = data.lines[0]?.id ?? ''
  let selectedStationId = data.lines[0]?.stations[0] ?? ''

  app.innerHTML = renderAppShell(data)

  const elements = getAppElements(app)

  function currentLine() {
    return linesById.get(selectedLineId) ?? data.lines[0]
  }

  function currentStation() {
    const line = currentLine()
    return stationsById.get(selectedStationId) ?? stationsById.get(line.stations[0]) ?? null
  }

  function renderOriginDetails(station: MetroStation, wiki: WikiStationDetails | null, wikiState: WikiStatus) {
    if (wikiState === 'error') {
      return '<p>Le contexte historique n’a pas pu être récupéré pour cette station.</p>'
    }

    if (!wiki) {
      return `
        <div class="history-loading" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `
    }

    const intro = wiki.namedAfter
      ? `La station doit son nom à <strong>${escapeHtml(wiki.namedAfter)}</strong>.`
      : wiki.namedAfterTitle
        ? `Le nom de la station renvoie à <strong>${escapeHtml(wiki.namedAfterTitle)}</strong>.`
        : `Le nom de la station renvoie à <strong>${escapeHtml(station.name)}</strong> et à son contexte urbain ou historique.`

    const subjectText = extractSentences(wiki.namedAfterSummary, 2).join(' ')
    const stationText = extractSentences(wiki.summary, 2).join(' ')
    const locationText = station.arrondissement
      ? `Elle se situe dans le <strong>${station.arrondissement}e arrondissement</strong> de Paris.`
      : station.municipality
        ? `Elle se situe sur la commune de <strong>${escapeHtml(station.municipality)}</strong>.`
        : ''

    return [
      `<p>${intro}</p>`,
      subjectText ? `<p>${escapeHtml(subjectText)}</p>` : '',
      locationText ? `<p>${locationText}</p>` : '',
      stationText ? `<p>${escapeHtml(stationText)}</p>` : '',
      wiki.constructionYear ? `<p>Mise en service relevée dans Wikimedia : <strong>${wiki.constructionYear}</strong>.</p>` : '',
    ].filter(Boolean).join('')
  }

  function ensureWiki(station: MetroStation) {
    const status = wikiStatus.get(station.id) ?? 'idle'
    if (status === 'loading' || status === 'ready') {
      return
    }

    wikiStatus.set(station.id, 'loading')
    renderDetail()

    void fetchWikipediaStationInfo(station)
      .then((details) => {
        wikiCache.set(station.id, details)
        wikiStatus.set(station.id, 'ready')
        if (currentStation()?.id === station.id) {
          renderDetail()
        }
      })
      .catch(() => {
        wikiStatus.set(station.id, 'error')
        if (currentStation()?.id === station.id) {
          renderDetail()
        }
      })
  }

  function renderLines() {
    const line = currentLine()
    elements.lineList.innerHTML = data.lines
      .map((entry) => `
        <button
          class="line-pill ${entry.id === line.id ? 'is-active' : ''}"
          type="button"
          data-line-id="${entry.id}"
          style="--line-color:${entry.color};"
        >
          ${renderLineIcon(entry, escapeHtml)}
          <span class="line-copy">
            <strong>${escapeHtml(entry.label)}</strong>
            <small>${entry.stationCount} stations</small>
          </span>
        </button>
      `)
      .join('')
  }

  function renderStations() {
    const line = currentLine()
    elements.stationsTitle.textContent = line.label

    elements.stationList.innerHTML = line.stations
      .map((stationId) => stationsById.get(stationId))
      .filter((station): station is MetroStation => Boolean(station))
      .map((station) => `
        <button
          class="station-chip ${station.id === selectedStationId ? 'is-active' : ''}"
          type="button"
          data-station-id="${station.id}"
        >
          <span class="station-accent" style="--station-color:${station.lineColor};"></span>
          <span>${escapeHtml(station.name)}</span>
        </button>
      `)
      .join('')
  }

  function renderDetail() {
    const station = currentStation()
    if (!station) {
      elements.detailPanel.innerHTML = ''
      return
    }

    const line = currentLine()
    const wiki = wikiCache.get(station.id) ?? null
    const wikiState = wikiStatus.get(station.id) ?? 'idle'
    const constructionValue =
      wiki?.constructionYear ??
      station.constructionYear ??
      (wikiState === 'ready' || wikiState === 'error' ? 'Non documenté' : 'Chargement…')

    elements.detailPanel.innerHTML = `
      <div class="detail-header">
        <div>
          <p class="station-overline">${escapeHtml(station.lineLabel)}</p>
          <h2>${escapeHtml(station.name)}</h2>
          <p class="station-location">${escapeHtml(formatLocation(station))}</p>
        </div>
        <div class="detail-badge-wrap">
          ${
            line.linePictoUrl
              ? `<img class="detail-picto" src="${line.linePictoUrl}" alt="Picto officiel ${escapeHtml(line.label)}">`
              : `<span class="detail-line-badge" style="--line-color:${station.lineColor};">${escapeHtml(station.lineId)}</span>`
          }
        </div>
      </div>

      <div class="stat-grid">
        <article class="stat-card">
          <span>Construction</span>
          <strong>${constructionValue}</strong>
        </article>
        <article class="stat-card">
          <span>Sorties</span>
          <strong>${station.exitCount ?? 'Non documenté'}</strong>
        </article>
        <article class="stat-card">
          <span>Fréquentation</span>
          <strong>${escapeHtml(formatPassengers(station))}</strong>
        </article>
        <article class="stat-card">
          <span>Zone IDFM</span>
          <strong>${escapeHtml(station.stopZoneId)}</strong>
        </article>
      </div>

      <section class="note-block">
        <h3>Pourquoi ce nom ?</h3>
        <div class="history-copy">
          ${renderOriginDetails(station, wiki, wikiState)}
        </div>
      </section>

      <div class="source-links">
        ${
          wiki?.wikiUrl
            ? `<a href="${wiki.wikiUrl}" target="_blank" rel="noreferrer">Article Wikipédia</a>`
            : ''
        }
        <a href="${data.sources.metroStations}" target="_blank" rel="noreferrer">Jeu IDFM stations</a>
        <a href="${data.sources.stopAccess}" target="_blank" rel="noreferrer">Jeu IDFM accès</a>
        <a href="${data.sources.traffic}" target="_blank" rel="noreferrer">Jeu RATP fréquentation</a>
      </div>
    `

    if (wikiState === 'idle') {
      ensureWiki(station)
    }
  }

  elements.lineList.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const button = target.closest<HTMLButtonElement>('[data-line-id]')
    if (!button) {
      return
    }

    const nextLineId = button.dataset.lineId
    if (!nextLineId || nextLineId === selectedLineId) {
      return
    }

    selectedLineId = nextLineId
    selectedStationId = currentLine().stations[0] ?? ''
    renderLines()
    renderStations()
    renderDetail()
  })

  elements.stationList.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const button = target.closest<HTMLButtonElement>('[data-station-id]')
    if (!button) {
      return
    }

    const nextStationId = button.dataset.stationId
    if (!nextStationId || nextStationId === selectedStationId) {
      return
    }

    selectedStationId = nextStationId
    renderStations()
    renderDetail()
  })

  renderLines()
  renderStations()
  renderDetail()
}

function getAppElements(app: HTMLDivElement): AppElements {
  const lineList = app.querySelector<HTMLDivElement>('#line-list')
  const stationsTitle = app.querySelector<HTMLHeadingElement>('#stations-title')
  const stationList = app.querySelector<HTMLDivElement>('#station-list')
  const detailPanel = app.querySelector<HTMLElement>('#detail-panel')

  if (!lineList || !stationsTitle || !stationList || !detailPanel) {
    throw new Error('Structure de rendu introuvable')
  }

  return {
    lineList,
    stationsTitle,
    stationList,
    detailPanel,
  }
}
