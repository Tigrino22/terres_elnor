# Carte du monde

La fenêtre ouverte avec la touche **M** : un parchemin du continent, où chaque case est une carte du jeu.

## Les fichiers

| Fichier | Rôle | On y touche pour… |
|---|---|---|
| `donnees.ts` | Le contenu : grille, silhouette du continent, zones, villes, sanctuaires, donjons, routes, rivières, lacs. Uniquement des données. | ajouter une région, déplacer une ville, tracer une route |
| `relief.ts` | La géographie calculée : `estTerre`, `zoneDe`, `estDecouverte`, conversions case ↔ pixel. Fonctions pures, sans navigateur. | changer la règle des frontières ou de la brume |
| `dessin.ts` | Le dessin du parchemin (tout ce qui ne bouge pas). `DECORS` donne un petit dessin par type de décor de zone ; `ENCRE` regroupe les couleurs. | refaire la charte graphique de la carte |
| `fenetre.ts` | La fenêtre : parchemin et panneau côte à côte, navigation à la souris, calque SVG des marques qui changent en jeu (ta position, les cartes ouvertes, la case survolée ou choisie), info-bulle. `NAVIGATION` regroupe les réglages (zoom max, pas de molette…). | changer l'ergonomie de la fenêtre |
| `carte-monde.css` | L'apparence de la fenêtre et des marques du calque. | couleurs des marques, taille du panneau |

Les cartes **jouables** viennent de `src/shared/data.ts` (`MAPS`, champ `coords`) : elles apparaissent toutes seules sur le parchemin, rien à recopier ici.

## Navigation

- glisser avec le bouton gauche : déplacer le parchemin ;
- molette : zoom autour du curseur ; double-clic : zoom avant ;
- boutons `+`, `−`, `⤢` (toute la carte), `◎` (centrer sur moi) ;
- clic sur une case : sa fiche s'affiche en haut du panneau ; clic sur une carte ouverte du panneau : la vue s'y centre.

Le parchemin est dessiné une seule fois, à deux fois sa taille pour rester net en zoom. Se déplacer ou zoomer ne change qu'une transformation CSS.

## Recettes

- **Nouvelle région** : ajouter une entrée à `ZONES` (`centre` = case autour de laquelle elle s'étend, `etiquette` = position du nom, `decouverte` de 0 à 1, `decor`).
- **Nouveau type de décor** : l'ajouter au type `Decor` (`donnees.ts`) puis une fonction dans `DECORS` (`dessin.ts`). TypeScript signale l'oubli.
- **Agrandir le continent** : `FORME.rayons` et, si besoin, `GRILLE` (garder `largeur`/`hauteur` cohérents avec `marge` et `taille`).
- **Couleur d'une marque** (position du joueur, case choisie…) : `carte-monde.css`, classes `.cm-…`.

`tests/carte-monde.test.ts` vérifie que les cartes jouables, villes, sanctuaires et donjons sont bien sur la terre et que chaque zone a au moins une case.

## Point connu

La carte « Route de Valcourt » (4, −1) est annoncée dans les Plaines d'Aldmar (`data.ts`) mais la case tombe dans la zone du Bois de Fenrel sur le parchemin. À trancher lors du prochain travail sur les régions : déplacer la carte, ou le centre d'une des deux zones.
