import type { MetroData } from '../types.ts'
import { dateFormatter } from '../utils/format.ts'
import { escapeHtml } from '../utils/text.ts'

export function renderAppShell(data: MetroData) {
  return `
    <div class="page-shell">
      <header class="hero-panel">
        <div class="hero-grid">
          <div class="hero-copy">
            <p class="kicker">Le réseau, station par station</p>
            <h1>${escapeHtml(data.appName)}</h1>
            <p class="lede">
              Un atlas du métro parisien centré sur les lignes, les stations, leurs données d’usage
              et l’histoire de leurs noms.
            </p>
          </div>
          <div class="hero-aside">
            <div class="status-panel">
              <span class="source-label">Dernière mise à jour</span>
              <strong>${escapeHtml(dateFormatter.format(new Date(data.generatedAt)))}</strong>
              <p>Données de fréquentation RATP : millésime ${data.trafficYear}.</p>
            </div>
            <div class="network-ribbon" aria-hidden="true">
              ${data.lines
                .slice(0, 8)
                .map((line) => `<span style="--swatch:${line.color};"></span>`)
                .join('')}
            </div>
          </div>
        </div>
      </header>

      <section class="line-strip">
        <div class="section-heading">
          <h2>Lignes</h2>
          <p>${data.lines.length} lignes de métro</p>
        </div>
        <div class="line-list" id="line-list"></div>
      </section>

      <main class="content-grid">
        <section class="station-panel">
          <div class="section-heading">
            <h2 id="stations-title"></h2>
            <p>Choisissez une station.</p>
          </div>
          <div class="station-list" id="station-list"></div>
        </section>

        <aside class="detail-panel" id="detail-panel"></aside>
      </main>
    </div>
  `
}

export function renderLoadingState() {
  return `
    <div class="loading-state">
      <p class="kicker">Le Metropolitain</p>
      <h1>Chargement du réseau…</h1>
      <p>Préparation de l’atlas du métro parisien.</p>
    </div>
  `
}

export function renderErrorState(message: string) {
  return `
    <div class="loading-state is-error">
      <p class="kicker">Le Metropolitain</p>
      <h1>Données indisponibles</h1>
      <p>${escapeHtml(message)}</p>
    </div>
  `
}
