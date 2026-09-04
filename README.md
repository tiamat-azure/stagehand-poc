# POC Stagehand v3 - navigateur local

Automatisation d'un scenario YouTube avec [Stagehand v3](https://docs.stagehand.dev)
en mode **100 % local** : Chromium lance sur la machine, Claude (Anthropic) pour les
etapes IA, **aucune dependance Browserbase**.

Specification : [`PRD.md`](./PRD.md).

## Scenario

1. `page.goto("https://www.youtube.com/")` - deterministe ;
2. acceptation de la banniere de consentement si presente ;
3. `observe()` du champ de recherche, puis `act()` pour le focus ;
4. saisie de `POE2` et validation par `Enter` - deterministe ;
5. `act()` pour ouvrir la premiere video des resultats ;
6. verification que l'URL finale est bien une page de lecture.

Les etapes previsibles utilisent l'API navigateur ; le LLM ne sert qu'a localiser
les elements instables (section 9 du PRD).

## Prerequis

- Node.js 20+ (teste avec 24)
- `make`
- un serveur X/Wayland disponible pour le mode visible (`DISPLAY`)

## Installation

```bash
make install     # dependances npm + Chromium pour Stagehand (si absents)
make env         # cree .env depuis .env.example
```

Renseignez ensuite votre cle dans `.env` :

```dotenv
ANTHROPIC_API_KEY=sk-ant-...
```

**Ne definissez ni `BROWSERBASE_API_KEY` ni `BROWSERBASE_PROJECT_ID`** : le POC
refuse de demarrer si l'une des deux est presente.

## Utilisation

| Commande         | Effet                                                            |
| ---------------- | ---------------------------------------------------------------- |
| `make start`     | Lance le scenario en arriere-plan, laisse le navigateur ouvert    |
| `make stop`      | Arrete le POC et ferme le navigateur                              |
| `make restart`   | `stop` puis `start`                                               |
| `make status`    | Indique si le POC tourne                                          |
| `make logs`      | Suit `.run/poc.log`                                               |
| `make headless`  | Execution au premier plan sans fenetre, fermeture automatique     |
| `make test`      | `tsc --noEmit` puis tests unitaires (`node --test`)               |
| `make clean`     | Supprime `.run/`                                                  |

`make help` liste l'ensemble des cibles.

## Variables d'environnement

| Variable            | Defaut                       | Role                                   |
| ------------------- | ---------------------------- | -------------------------------------- |
| `ANTHROPIC_API_KEY` | -                            | **Requise.** Cle Anthropic             |
| `YOUTUBE_QUERY`     | `POE2`                       | Requete de recherche                   |
| `STAGEHAND_MODEL`   | `anthropic/claude-sonnet-4-6`| Modele Stagehand (`provider/model`)    |
| `HEADLESS`          | `0`                          | `1` pour un run sans fenetre           |
| `KEEP_OPEN`         | `1`                          | `0` pour fermer le navigateur a la fin |
| `STAGEHAND_VERBOSE` | `1`                          | Verbosite Stagehand (`0`, `1`, `2`)    |

## Variante agentique

La section 11 du PRD (boucle agentique complete) est implementee dans
`src/youtube-agent.ts` :

```bash
npm run start:agent
```

Moins deterministe que la voie principale, elle sert de base a l'evolution
decrite en section 17.

## Structure

```
src/config.ts          # validation d'environnement + options Stagehand
src/scenario.ts        # scenario YouTube (goto / observe / act)
src/youtube.ts         # entrypoint principal, gestion du cycle de vie
src/youtube-agent.ts   # variante agentique (PRD section 11)
scripts/poc.sh         # start / stop / status / logs
tests/                 # tests unitaires (config + garde anti-Browserbase)
```
