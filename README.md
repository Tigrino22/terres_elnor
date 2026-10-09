# Terres d'Elnor

MMORPG navigateur en vue isométrique, PvM en temps réel. Premier jalon jouable de la V1.

## Lancer le jeu

```bash
npm install
npm run dev        # http://localhost:8080 (serveur de jeu + client avec rechargement)
```

En production :

```bash
npm run build      # client dans dist/
npm start          # sert dist/ et le jeu sur le port 8080 (variable PORT)
```

Sans serveur joignable (page statique), le client fait tourner le monde dans le navigateur : partie solo.

```bash
npm test           # tests de la simulation
npm run typecheck
```

## Ce qui marche

- Trois cartes reliées par des portails : Route de Valcourt (4, −1), Bois de Fenrel (4, −2), Lisière de Fenrel (5, −2). Deux portails « bientôt » montrent la suite du monde.
- Portails très visibles : arche de pierre, colonne de lumière, cercle de runes, flèche et nom de la destination.
- Déplacement ZQSD, WASD ou flèches, prédiction côté client et correction par le serveur.
- Tir automatique, ciblage Tab ou clic, 6 sorts de la Voie de l'Arc débloqués avec les niveaux, 2 potions.
- PV, bouclier qui se recharge, mana, XP et niveaux (1 à 20), écus.
- Monstres : sangliers (passifs), éclaireurs gorroks, loups des brumes en meute, Grisecroc l'alpha avec une ruée annoncée au sol.
- Butin à ramasser, récolte (frêne, cuivre, lunaire), atelier avec 8 recettes, équipement qui change les stats.
- Multijoueur : chaque joueur voit les autres sur sa carte, chat global.
- Minicarte, carte du monde façon parchemin (M), sac et atelier (I, F), aide (H).

## Organisation

| Dossier | Rôle |
|---|---|
| `src/shared` | Données de jeu (`data.ts`), génération des cartes, collisions, formules, protocole |
| `src/sim` | Simulation autoritaire du monde, sans dépendance navigateur ni Node |
| `src/server` | Serveur HTTP + WebSocket, boucle à 20 ticks par seconde |
| `src/client` | Rendu Three.js low-poly, interface HTML, entrées, réseau |
| `tests` | Tests Vitest de la simulation |

Les cartes sont générées de façon déterministe à partir de leur graine : le serveur et le client calculent la même carte, rien n'est envoyé sur le réseau à part les entités.

L'équilibrage (monstres, sorts, objets, recettes, cartes) est entièrement dans `src/shared/data.ts`.

## Prochaines étapes proposées

- Sauvegarde des personnages (PostgreSQL) et comptes.
- Voies de la Lame et de l'Arcane, nains jouables.
- Ville de Valcourt (marchands, banque), plus de cartes, premier donjon.
