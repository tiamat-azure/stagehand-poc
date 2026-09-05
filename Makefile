# POC Stagehand v3 - navigateur local (voir PRD.md)

SHELL := /bin/bash
NPM   ?= npm
POC   := ./scripts/poc.sh

# Modificateur de scenario : `make start agent` / `make headless agent` jouent
# la variante agentique (src/youtube-agent.ts) au lieu du scenario deterministe
# (src/youtube.ts). GNU make rejette les options inconnues comme `--agent` :
# le modificateur passe donc par un but supplementaire, sans effet propre.
ifneq (,$(filter agent,$(MAKECMDGOALS)))
NPM_START := run start:agent
else
NPM_START := start
endif

.DEFAULT_GOAL := help

.PHONY: help install chromium env start headless agent stop restart status logs test clean distclean

help: ## Affiche cette aide
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: node_modules chromium ## Installe les dependances npm et le Chromium de Stagehand

node_modules: package.json package-lock.json
	$(NPM) install
	@touch node_modules

# Cible interne : n'installe le navigateur que si le binaire est absent du cache.
chromium: node_modules
	@node -e 'const {chromium} = require("playwright"); \
		process.exit(require("fs").existsSync(chromium.executablePath()) ? 0 : 1)' \
		2>/dev/null || npx playwright install chromium

env: ## Cree .env a partir de .env.example si absent
	@test -f .env || { cp .env.example .env; echo "Cree .env : renseignez ANTHROPIC_API_KEY."; }

start: install ## Lance le POC en arriere-plan (navigateur laisse ouvert)
	@NPM_START="$(NPM_START)" $(POC) start

headless: install ## Lance le POC au premier plan, sans fenetre, et ferme le navigateur a la fin
	@KEEP_OPEN=0 HEADLESS=1 $(NPM) $(NPM_START)

agent: ## Modificateur : ajoute a `start` ou `headless` pour jouer la variante agentique
	@:

stop: ## Arrete le POC et ferme le navigateur
	@$(POC) stop

restart: ## Enchaine stop puis start
	@$(POC) stop
	@NPM_START="$(NPM_START)" $(POC) start

status: ## Indique si le POC tourne
	@$(POC) status

logs: ## Suit les logs du POC lance par `make start`
	@$(POC) logs

test: install ## Verifie les types puis execute les tests unitaires
	$(NPM) run typecheck
	$(NPM) test

clean: ## Supprime les artefacts d'execution
	rm -rf .run

distclean: clean ## Supprime aussi node_modules
	rm -rf node_modules
