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
| `make ... agent` | Suffixe `agent` : joue la variante agentique au lieu du scenario deterministe |
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

## Les deux scenarios

| Scenario | Fichier | Principe |
| -------- | ------- | -------- |
| **deterministe** (defaut) | `src/youtube.ts` | `goto` + saisie clavier, LLM limite a `observe()` / `act()` sur les elements instables |
| **agentique** (PRD section 11) | `src/youtube-agent.ts` | scenario entierement delegue a la boucle agentique Stagehand |

Le suffixe `agent` bascule n'importe quelle cible de lancement :

```bash
make start              # deterministe, en arriere-plan
make start agent        # agentique, en arriere-plan (make stop / logs / status inchanges)
make headless           # deterministe, sans fenetre
make headless agent     # agentique, sans fenetre
```

GNU make refuse les options inconnues (`make start --agent` echoue) : le
modificateur est donc un but supplementaire, sans effet propre.

Les deux points d'entree partagent le meme contrat : verification de la page de
lecture finale, respect de `KEEP_OPEN`, code de sortie non nul en cas d'echec.
La voie agentique reste moins deterministe et sert de base a l'evolution
decrite en section 17 du PRD.

## Structure

```
src/config.ts          # validation d'environnement + options Stagehand
src/lifecycle.ts       # cycle de vie partage (KEEP_OPEN, signaux d'arret)
src/scenario.ts        # scenario YouTube deterministe (goto / observe / act)
src/youtube.ts         # entrypoint deterministe
src/youtube-agent.ts   # entrypoint agentique (PRD section 11)
scripts/poc.sh         # start / stop / status / logs
tests/                 # tests unitaires (config + garde anti-Browserbase)
```
