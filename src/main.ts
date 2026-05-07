import './style.css'
import { renderMetroApp } from './app/metroApp.ts'
import { renderErrorState, renderLoadingState } from './app/template.ts'
import { loadData } from './services/data.ts'
import { escapeHtml } from './utils/text.ts'

const appElement = document.querySelector<HTMLDivElement>('#app')

if (!appElement) {
  throw new Error('App container not found')
}

appElement.innerHTML = renderLoadingState()

loadData()
  .then((data) => {
    renderMetroApp(appElement, data)
  })
  .catch((error: unknown) => {
    appElement.innerHTML = renderErrorState(error instanceof Error ? error.message : escapeHtml('Erreur inconnue'))
  })
