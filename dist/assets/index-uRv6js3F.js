(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();async function e(e){let t=await fetch(e);if(!t.ok)throw Error(`Request failed: ${t.status}`);return t.json()}function t(e){let t=(e??[]).map(e=>{let t=e?.mainsnak?.datavalue?.value?.time;return t?Number.parseInt(String(t).slice(1,5),10):null}).filter(e=>Number.isFinite(e));return t.length>0?Math.min(...t):null}async function n(t,n){let r=new URL(`https://fr.wikipedia.org/w/api.php`);r.searchParams.set(`action`,`query`),r.searchParams.set(`prop`,`extracts`),r.searchParams.set(`explaintext`,`1`),r.searchParams.set(`exintro`,`1`),r.searchParams.set(`exchars`,String(n)),r.searchParams.set(`redirects`,`1`),r.searchParams.set(`titles`,t),r.searchParams.set(`format`,`json`),r.searchParams.set(`origin`,`*`);let i=await e(r),a=Object.values(i.query?.pages??{}).find(e=>!e.missing);return{title:a?.title??null,extract:a?.extract??null}}async function r(t){let n=new URL(`https://fr.wikipedia.org/w/api.php`);return n.searchParams.set(`action`,`query`),n.searchParams.set(`list`,`search`),n.searchParams.set(`srsearch`,t),n.searchParams.set(`srlimit`,`1`),n.searchParams.set(`format`,`json`),n.searchParams.set(`origin`,`*`),(await e(n)).query?.search?.[0]?.title??null}async function i(i){let a=`${i.name} (métro de Paris)`,o=new URL(`https://fr.wikipedia.org/w/api.php`);o.searchParams.set(`action`,`query`),o.searchParams.set(`prop`,`pageprops|extracts`),o.searchParams.set(`ppprop`,`wikibase_item`),o.searchParams.set(`explaintext`,`1`),o.searchParams.set(`exchars`,`1400`),o.searchParams.set(`redirects`,`1`),o.searchParams.set(`titles`,a),o.searchParams.set(`format`,`json`),o.searchParams.set(`origin`,`*`);let s=await e(o),c=Object.values(s.query?.pages??{}).find(e=>!e.missing);if(!c){let t=new URL(`https://fr.wikipedia.org/w/api.php`);t.searchParams.set(`action`,`query`),t.searchParams.set(`list`,`search`),t.searchParams.set(`srsearch`,`"${i.name}" "métro de Paris"`),t.searchParams.set(`srlimit`,`1`),t.searchParams.set(`format`,`json`),t.searchParams.set(`origin`,`*`);let n=(await e(t)).query?.search?.[0]?.title;n&&(o.searchParams.set(`titles`,n),s=await e(o),c=Object.values(s.query?.pages??{}).find(e=>!e.missing))}if(!c)return{constructionYear:null,namedAfter:null,namedAfterTitle:null,namedAfterSummary:null,summary:null,wikiUrl:null};let l=c.pageprops?.wikibase_item,u=null,d=null,f=null,p=null;if(l){let r=new URL(`https://www.wikidata.org/w/api.php`);r.searchParams.set(`action`,`wbgetentities`),r.searchParams.set(`ids`,l),r.searchParams.set(`languages`,`fr`),r.searchParams.set(`format`,`json`),r.searchParams.set(`origin`,`*`);let i=(await e(r)).entities?.[l];u=t(i?.claims?.P1619)??t(i?.claims?.P571);let a=(i?.claims?.P138?.[0])?.mainsnak?.datavalue?.value?.id;if(a){let t=new URL(`https://www.wikidata.org/w/api.php`);t.searchParams.set(`action`,`wbgetentities`),t.searchParams.set(`ids`,a),t.searchParams.set(`languages`,`fr`),t.searchParams.set(`format`,`json`),t.searchParams.set(`origin`,`*`);let r=(await e(t)).entities?.[a];d=r?.labels?.fr?.value??null;let i=r?.sitelinks?.frwiki?.title;f=i??d,i&&(p=(await n(i,420)).extract)}}if(!p){let e=await n(i.name,420);if(f??=e.title,p=e.extract,!p){let e=await r(`"${i.name}"`);if(e){let t=await n(e,420);f??=t.title,p=t.extract}}}return{constructionYear:u,namedAfter:d,namedAfterTitle:f,namedAfterSummary:p,summary:c.extract??null,wikiUrl:c.title?`https://fr.wikipedia.org/wiki/${encodeURIComponent(c.title.replaceAll(` `,`_`))}`:null}}var a=new Intl.NumberFormat(`fr-FR`),o=new Intl.DateTimeFormat(`fr-FR`,{dateStyle:`long`,timeStyle:`short`});function s(e){return!e.annualPassengers||!e.annualPassengersYear?`Non documenté`:`${a.format(e.annualPassengers)} entrées (${e.annualPassengersYear})`}function c(e){return e.arrondissement?`Paris ${e.arrondissement}e`:e.municipality??`Île-de-France`}function l(e,t){return e.linePictoUrl?`<img class="line-picto" src="${e.linePictoUrl}" alt="Picto officiel ${t(e.label)}">`:`<span class="line-marker" style="--line-color:${e.color};">${t(e.id)}</span>`}function u(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function d(e,t){return e?e.replace(/^==+\s.*?\s==+$/gm,` `).replace(/\s+/g,` `).split(/(?<=[.!?])\s+/).map(e=>e.trim()).filter(Boolean).slice(0,t):[]}function f(e){return`
    <div class="page-shell">
      <header class="hero-panel">
        <div class="hero-grid">
          <div class="hero-copy">
            <p class="kicker">Le réseau, station par station</p>
            <h1>${u(e.appName)}</h1>
            <p class="lede">
              Un atlas du métro parisien centré sur les lignes, les stations, leurs données d’usage
              et l’histoire de leurs noms.
            </p>
          </div>
          <div class="hero-aside">
            <div class="status-panel">
              <span class="source-label">Dernière mise à jour</span>
              <strong>${u(o.format(new Date(e.generatedAt)))}</strong>
              <p>Données de fréquentation RATP : millésime ${e.trafficYear}.</p>
            </div>
            <div class="network-ribbon" aria-hidden="true">
              ${e.lines.slice(0,8).map(e=>`<span style="--swatch:${e.color};"></span>`).join(``)}
            </div>
          </div>
        </div>
      </header>

      <section class="line-strip">
        <div class="section-heading">
          <h2>Lignes</h2>
          <p>${e.lines.length} lignes de métro</p>
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
  `}function p(){return`
    <div class="loading-state">
      <p class="kicker">Le Metropolitain</p>
      <h1>Chargement du réseau…</h1>
      <p>Préparation de l’atlas du métro parisien.</p>
    </div>
  `}function m(e){return`
    <div class="loading-state is-error">
      <p class="kicker">Le Metropolitain</p>
      <h1>Données indisponibles</h1>
      <p>${u(e)}</p>
    </div>
  `}function h(e,t){let n=new Map(t.stations.map(e=>[e.id,e])),r=new Map(t.lines.map(e=>[e.id,e])),a=new Map,o=new Map,p=t.lines[0]?.id??``,m=t.lines[0]?.stations[0]??``;e.innerHTML=f(t);let h=g(e);function _(){return r.get(p)??t.lines[0]}function v(){let e=_();return n.get(m)??n.get(e.stations[0])??null}function y(e,t,n){if(n===`error`)return`<p>Le contexte historique n’a pas pu être récupéré pour cette station.</p>`;if(!t)return`
        <div class="history-loading" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;let r=t.namedAfter?`La station doit son nom à <strong>${u(t.namedAfter)}</strong>.`:t.namedAfterTitle?`Le nom de la station renvoie à <strong>${u(t.namedAfterTitle)}</strong>.`:`Le nom de la station renvoie à <strong>${u(e.name)}</strong> et à son contexte urbain ou historique.`,i=d(t.namedAfterSummary,2).join(` `),a=d(t.summary,2).join(` `),o=e.arrondissement?`Elle se situe dans le <strong>${e.arrondissement}e arrondissement</strong> de Paris.`:e.municipality?`Elle se situe sur la commune de <strong>${u(e.municipality)}</strong>.`:``;return[`<p>${r}</p>`,i?`<p>${u(i)}</p>`:``,o?`<p>${o}</p>`:``,a?`<p>${u(a)}</p>`:``,t.constructionYear?`<p>Mise en service relevée dans Wikimedia : <strong>${t.constructionYear}</strong>.</p>`:``].filter(Boolean).join(``)}function b(e){let t=o.get(e.id)??`idle`;t===`loading`||t===`ready`||(o.set(e.id,`loading`),C(),i(e).then(t=>{a.set(e.id,t),o.set(e.id,`ready`),v()?.id===e.id&&C()}).catch(()=>{o.set(e.id,`error`),v()?.id===e.id&&C()}))}function x(){let e=_();h.lineList.innerHTML=t.lines.map(t=>`
        <button
          class="line-pill ${t.id===e.id?`is-active`:``}"
          type="button"
          data-line-id="${t.id}"
          style="--line-color:${t.color};"
        >
          ${l(t,u)}
          <span class="line-copy">
            <strong>${u(t.label)}</strong>
            <small>${t.stationCount} stations</small>
          </span>
        </button>
      `).join(``)}function S(){let e=_();h.stationsTitle.textContent=e.label,h.stationList.innerHTML=e.stations.map(e=>n.get(e)).filter(e=>!!e).map(e=>`
        <button
          class="station-chip ${e.id===m?`is-active`:``}"
          type="button"
          data-station-id="${e.id}"
        >
          <span class="station-accent" style="--station-color:${e.lineColor};"></span>
          <span>${u(e.name)}</span>
        </button>
      `).join(``)}function C(){let e=v();if(!e){h.detailPanel.innerHTML=``;return}let n=_(),r=a.get(e.id)??null,i=o.get(e.id)??`idle`,l=r?.constructionYear??e.constructionYear??(i===`ready`||i===`error`?`Non documenté`:`Chargement…`);h.detailPanel.innerHTML=`
      <div class="detail-header">
        <div>
          <p class="station-overline">${u(e.lineLabel)}</p>
          <h2>${u(e.name)}</h2>
          <p class="station-location">${u(c(e))}</p>
        </div>
        <div class="detail-badge-wrap">
          ${n.linePictoUrl?`<img class="detail-picto" src="${n.linePictoUrl}" alt="Picto officiel ${u(n.label)}">`:`<span class="detail-line-badge" style="--line-color:${e.lineColor};">${u(e.lineId)}</span>`}
        </div>
      </div>

      <div class="stat-grid">
        <article class="stat-card">
          <span>Construction</span>
          <strong>${l}</strong>
        </article>
        <article class="stat-card">
          <span>Sorties</span>
          <strong>${e.exitCount??`Non documenté`}</strong>
        </article>
        <article class="stat-card">
          <span>Fréquentation</span>
          <strong>${u(s(e))}</strong>
        </article>
        <article class="stat-card">
          <span>Zone IDFM</span>
          <strong>${u(e.stopZoneId)}</strong>
        </article>
      </div>

      <section class="note-block">
        <h3>Pourquoi ce nom ?</h3>
        <div class="history-copy">
          ${y(e,r,i)}
        </div>
      </section>

      <div class="source-links">
        ${r?.wikiUrl?`<a href="${r.wikiUrl}" target="_blank" rel="noreferrer">Article Wikipédia</a>`:``}
        <a href="${t.sources.metroStations}" target="_blank" rel="noreferrer">Jeu IDFM stations</a>
        <a href="${t.sources.stopAccess}" target="_blank" rel="noreferrer">Jeu IDFM accès</a>
        <a href="${t.sources.traffic}" target="_blank" rel="noreferrer">Jeu RATP fréquentation</a>
      </div>
    `,i===`idle`&&b(e)}h.lineList.addEventListener(`click`,e=>{let t=e.target.closest(`[data-line-id]`);if(!t)return;let n=t.dataset.lineId;!n||n===p||(p=n,m=_().stations[0]??``,x(),S(),C())}),h.stationList.addEventListener(`click`,e=>{let t=e.target.closest(`[data-station-id]`);if(!t)return;let n=t.dataset.stationId;!n||n===m||(m=n,S(),C())}),x(),S(),C()}function g(e){let t=e.querySelector(`#line-list`),n=e.querySelector(`#stations-title`),r=e.querySelector(`#station-list`),i=e.querySelector(`#detail-panel`);if(!t||!n||!r||!i)throw Error(`Structure de rendu introuvable`);return{lineList:t,stationsTitle:n,stationList:r,detailPanel:i}}async function _(){let e=await fetch(`/data/metro-data.json`);if(!e.ok)throw Error(`Impossible de charger les données : ${e.status}`);return e.json()}var v=document.querySelector(`#app`);if(!v)throw Error(`App container not found`);v.innerHTML=p(),_().then(e=>{h(v,e)}).catch(e=>{v.innerHTML=m(e instanceof Error?e.message:u(`Erreur inconnue`))});