# Le Metropolitain

Application Vite dédiée au métro parisien.

Le projet affiche :
- les lignes de métro sous forme de liste horizontale
- les stations de la ligne sélectionnée
- une fiche station avec fréquentation, sorties, année de construction et contexte historique sur le nom

L’interface suit une direction visuelle inspirée de la signalétique RATP, avec récupération des pictogrammes officiels de ligne quand ils sont disponibles dans les données IDFM.

## Stack

- Vite
- TypeScript
- CSS vanilla
- APIs open data IDFM / RATP
- APIs Wikipédia / Wikidata pour l’enrichissement historique

## Commandes

Installation :

```bash
npm install
```

Lancer le projet en local :

```bash
npm run dev
```

Générer le snapshot local de données métro :

```bash
npm run sync:data
```

Build de production :

```bash
npm run build
```

Prévisualisation du build :

```bash
npm run preview
```

## Fonctionnement des données

Le projet repose sur un snapshot local généré dans `public/data/metro-data.json`.

Le script [scripts/sync-metro-data.mjs](/C:/Users/BryanGuillot/Documents/test/le-metropolitain/scripts/sync-metro-data.mjs:1) :
- récupère les stations métro depuis IDFM
- récupère les accès/sorties via les datasets `acces` et `relations-acces`
- récupère la fréquentation annuelle depuis le dataset RATP
- injecte les couleurs et pictos de lignes
- ajoute un fallback manuel pour la ligne `7 bis` si elle n’est pas correctement exposée dans le dataset principal

L’enrichissement historique n’est pas pré-calculé dans le snapshot. Il est chargé à la demande côté front via Wikipédia et Wikidata quand une station est ouverte.

## Sources

- IDFM stations :
  `https://data.iledefrance-mobilites.fr/explore/dataset/emplacement-des-gares-idf/`
- IDFM accès :
  `https://data.iledefrance-mobilites.fr/explore/dataset/acces/`
- IDFM relations d’accès :
  `https://data.iledefrance-mobilites.fr/explore/dataset/relations-acces/`
- RATP fréquentation annuelle :
  `https://data.ratp.fr/`
- Wikipédia API :
  `https://fr.wikipedia.org/w/api.php`
- Wikidata API :
  `https://www.wikidata.org/w/api.php`

## Architecture

Le front a été découpé pour garder un point d’entrée léger.

- [src/main.ts](/C:/Users/BryanGuillot/Documents/test/le-metropolitain/src/main.ts:1)
  Point d’entrée.
- [src/types.ts](/C:/Users/BryanGuillot/Documents/test/le-metropolitain/src/types.ts:1)
  Types métier.
- [src/services/data.ts](/C:/Users/BryanGuillot/Documents/test/le-metropolitain/src/services/data.ts:1)
  Chargement du snapshot local.
- [src/services/http.ts](/C:/Users/BryanGuillot/Documents/test/le-metropolitain/src/services/http.ts:1)
  Helper HTTP générique.
- [src/services/wikipedia.ts](/C:/Users/BryanGuillot/Documents/test/le-metropolitain/src/services/wikipedia.ts:1)
  Récupération du contexte historique et toponymique.
- [src/utils/text.ts](/C:/Users/BryanGuillot/Documents/test/le-metropolitain/src/utils/text.ts:1)
  Nettoyage et formatage de texte.
- [src/utils/format.ts](/C:/Users/BryanGuillot/Documents/test/le-metropolitain/src/utils/format.ts:1)
  Formatage d’affichage.
- [src/app/template.ts](/C:/Users/BryanGuillot/Documents/test/le-metropolitain/src/app/template.ts:1)
  Templates du shell principal.
- [src/app/metroApp.ts](/C:/Users/BryanGuillot/Documents/test/le-metropolitain/src/app/metroApp.ts:1)
  État UI, rendu et interactions.
- [src/style.css](/C:/Users/BryanGuillot/Documents/test/le-metropolitain/src/style.css:1)
  DA et styles globaux.

## Notes et limites

- La fréquentation utilise actuellement le millésime `2021`, qui est le dernier dataset RATP annuel validé dans ce projet au moment de l’intégration.
- La qualité du bloc `Pourquoi ce nom ?` dépend fortement de Wikipédia et Wikidata.
- Certains noms de station renvoient à des lieux, d’autres à des personnes, d’autres encore à des quartiers. Le fallback tente de trouver le meilleur article possible, mais ce n’est pas garanti à 100 %.
- La ligne `7 bis` utilise un fallback manuel pour les stations si les données IDFM restent incomplètes.

## Idées d’évolution

- ajouter l’ordre réel des stations sur chaque ligne
- ajouter une vue carte ou plan stylisé
- pré-cacher les enrichissements Wikipédia/Wikidata
- ajouter filtres, recherche et comparaison de stations
