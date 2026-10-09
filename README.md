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

### Jouer à plusieurs par internet

Le jeu en réseau passe par ce serveur : il suffit de l'héberger sur une machine joignable depuis internet et de donner son adresse. Tous ceux qui l'ouvrent jouent dans le même monde, avec leur compte. Le `Dockerfile` construit une image prête à lancer (port 8080, sauvegardes dans `/data`, à monter sur un volume persistant) :

```bash
docker build -t terres-elnor .
docker run -p 8080:8080 -v elnor-data:/data terres-elnor
```

Derrière un hébergeur en HTTPS, le client passe tout seul en `wss://`. La version publiée comme simple page (sans serveur) reste une partie solo.

Les comptes et les personnages sont enregistrés dans `data/comptes.json` (dossier modifiable avec la variable `DATA_DIR`). Les mots de passe sont hachés avec scrypt, jamais stockés en clair.

Sans serveur joignable (page statique), le client fait tourner le monde dans le navigateur : partie solo, avec les comptes et la sauvegarde gardés dans le navigateur (localStorage, mots de passe hachés avec PBKDF2).

```bash
npm test           # tests de la simulation
npm run typecheck
```

## Ce qui marche

- Quatre cartes reliées par des portails : Halte de Valcourt (4, 0), Route de Valcourt (4, −1), Bois de Fenrel (4, −2), Lisière de Fenrel (5, −2). Des portails « bientôt » montrent la suite du monde.
- Carte de départ commune, la Halte de Valcourt : sans monstres, un campement et son feu au centre. Tous les nouveaux personnages y apparaissent, pour se retrouver facilement.
- Fenêtre Social (touche O) : joueurs connectés et amis, avec race, voie, niveau et carte où ils se trouvent. On ajoute un ami connecté par son nom ; la liste d'amis est sauvegardée avec le personnage.
- Portails très visibles : arche de pierre, colonne de lumière, cercle de runes, flèche et nom de la destination.
- Déplacement ZQSD, WASD ou flèches, prédiction côté client et correction par le serveur.
- Tir automatique, ciblage Tab ou clic, 6 sorts de la Voie de l'Arc débloqués avec les niveaux, 2 potions.
- PV, bouclier qui se recharge, mana, XP et niveaux (1 à 20), écus.
- Monstres : sangliers (passifs), éclaireurs gorroks, loups des brumes en meute, Grisecroc l'alpha avec une ruée annoncée au sol.
- Butin à ramasser, récolte (frêne, cuivre, lunaire), atelier avec 8 recettes, équipement qui change les stats.
- Multijoueur : chaque joueur voit les autres sur sa carte, chat global.
- Minicarte, carte du monde façon parchemin (M), sac et atelier (I, F), aide (H).
- Page de connexion : création de compte (identifiant, mot de passe, nom du personnage, peuple) ou connexion. Un compte ne peut être connecté qu'une fois : une nouvelle connexion ferme l'ancienne.
- Sauvegarde automatique toutes les 30 s, à chaque changement de carte, montée de niveau, fabrication, point de sort et à la déconnexion. On reprend sur la même carte, au même endroit, avec son niveau, son XP, ses écus, son sac, son équipement et ses sorts.
- Chaque pièce d'équipement est dessinée sur le personnage (arc, capuche, tunique, bottes) ; sans équipement, il porte sa tenue de départ.
- Fenêtre d'équipement (C) : silhouette du personnage, 4 emplacements, caractéristiques, pièces du sac comparées à celles portées ; clic pour équiper ou retirer.
- Grimoire (K) : un point de sort par niveau gagné, chaque sort monte du rang 1 au rang 5 (un rang tous les 3 niveaux après son déblocage), avec plus de dégâts, une zone plus large, une immobilisation ou une marque plus longue, un bond plus long. Les points peuvent être réinitialisés.

## Organisation

| Dossier | Rôle |
|---|---|
| `src/shared` | Données de jeu (`data.ts`), génération des cartes, collisions, formules, protocole |
| `src/sim` | Simulation autoritaire du monde et comptes, sans dépendance navigateur ni Node |
| `src/server` | Serveur HTTP + WebSocket, boucle à 20 ticks par seconde, stockage des comptes |
| `src/client` | Rendu Three.js low-poly, interface HTML, entrées, réseau |
| `src/client/assets` | Apparence du jeu : un fichier par élément (personnage, équipement, objet, sort, monstre, ressource, décor). Voir son `LISEZMOI.md` |
| `src/client/carte-monde` | Carte du monde (touche M) : données des régions, géographie, dessin du parchemin, fenêtre navigable à la souris. Voir son `LISEZMOI.md` |
| `tests` | Tests Vitest de la simulation |

Les cartes sont générées de façon déterministe à partir de leur graine : le serveur et le client calculent la même carte, rien n'est envoyé sur le réseau à part les entités.

L'équilibrage (monstres, sorts, objets, recettes, cartes) est entièrement dans `src/shared/data.ts`. L'apparence est à part, dans `src/client/assets` : changer la charte graphique ne touche jamais aux règles du jeu.

## Prochaines étapes proposées

- Passer le stockage des comptes sur PostgreSQL quand il y aura beaucoup de joueurs.
- Voies de la Lame et de l'Arcane, nains jouables.
- Ville de Valcourt (marchands, banque), plus de cartes, premier donjon.
