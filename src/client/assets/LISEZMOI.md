# Éléments graphiques des Terres d'Elnor

Chaque élément du jeu a son propre fichier. Pour changer l'apparence d'un élément, on ouvre son fichier et on ne touche à rien d'autre : ni le moteur, ni l'équilibrage (`src/shared/data.ts`), ni les autres éléments.

| Dossier | Contenu | Un fichier par… |
|---|---|---|
| `personnages/` | `corps.ts` (silhouette commune), `elfe.ts`, `humain.ts` (couleurs et traits du peuple) | peuple |
| `equipement/` | pièces portées : icône du sac + pièce dessinée sur le personnage. `depart-*.ts` = tenue portée quand l'emplacement est vide, `carquois.ts` toujours porté, `arc-forme.ts` forme commune des arcs | objet équipable |
| `objets/` | icônes des ressources et consommables | objet |
| `sorts/` | icône de la barre, couleur du trait et de l'effet au sol (`piege.ts` contient aussi le piège posé au sol) | sort |
| `monstres/` | modèle 3D, taille, hauteur de l'étiquette | monstre |
| `ressources/` | frêne, filon, lunaire à récolter : modèle 3D et couleur du halo | ressource |
| `decor/` | arbres, sapins, buissons, rochers, sac de butin, grotte, portail | élément de décor |
| `terrain/sol.ts` | couleurs de l'herbe, des chemins, de l'eau, des fleurs | — |
| `effets/fleche.ts` | flèche en vol et traînée du tir automatique | — |
| `interface/` | icônes de l'interface (cadenas) | icône |

`kit.ts` contient les outils communs (assemblage de formes, fonds d'icônes) et `index.ts` le registre qui relie chaque identifiant du jeu à son fichier.

## Ajouter un élément

1. Créer son fichier dans le bon dossier, sur le modèle d'un voisin.
2. L'ajouter au registre `index.ts`.
3. `npm test` vérifie que chaque objet, sort, monstre et ressource du jeu a son fichier, que deux objets n'ont jamais la même icône et que chaque pièce d'équipement se voit sur le personnage.

## Modèles 3D

Les modèles sont construits en code à partir de formes simples (cylindres, sphères, cônes…) colorées, puis fusionnés en une seule géométrie. Le repère d'un modèle : pieds en `y = 0`, regard vers `+z`, 1 unité = 1 case. Plus tard, n'importe quel fichier peut être remplacé par un modèle importé (glTF) sans toucher au reste, tant qu'il fournit la même fonction.
