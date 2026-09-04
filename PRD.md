# POC — Stagehand v3 en mode 100 % navigateur local

## 1. Objectif

Mettre en œuvre un scénario de navigation Web automatisé avec **Stagehand v3**, sans utiliser l'infrastructure Browserbase.

Le programme doit :

1. lancer un navigateur Chromium/Chrome **localement** ;
2. utiliser **Stagehand v3** comme framework d'automatisation ;
3. fonctionner avec `env: "LOCAL"` ;
4. ne nécessiter **aucune `BROWSERBASE_API_KEY`** ni `BROWSERBASE_PROJECT_ID` ;
5. utiliser une clé `ANTHROPIC_API_KEY` fournie par l'utilisateur ;
6. ouvrir YouTube ;
7. effectuer une recherche YouTube sur **`POE2`** ;
8. valider la recherche avec Entrée ;
9. identifier la première vidéo dans les résultats ;
10. ouvrir/lancer cette première vidéo dans le navigateur.

Le résultat attendu est un navigateur visible à l'écran, ouvert sur YouTube, avec la première vidéo correspondant à la recherche `POE2` lancée.

---

## 2. Contraintes techniques

### Navigateur

Le navigateur doit être exécuté **localement**.

Utiliser :

```text
Chrome ou Chromium
        +
Playwright
        +
Stagehand v3
```

Stagehand v3 supporte explicitement :

```typescript
env: "LOCAL"
```

ainsi que `localBrowserLaunchOptions` pour contrôler le navigateur local.

### Browserbase

Ne pas utiliser :

```text
BROWSERBASE_API_KEY
BROWSERBASE_PROJECT_ID
env: "BROWSERBASE"
```

Le scénario doit fonctionner sans compte Browserbase.

Lorsque le mode `LOCAL` est utilisé, Stagehand peut lancer le navigateur localement.

### LLM

Utiliser Anthropic Claude avec :

```text
ANTHROPIC_API_KEY
```

et un modèle Stagehand de la forme :

```text
anthropic/claude-sonnet-4-6
```

Le modèle exact peut être adapté à la version actuellement supportée par Stagehand.

Stagehand v3 accepte les modèles sous la forme :

```text
provider/model
```

et notamment les modèles Anthropic.

---

# 3. Choix du langage

Utiliser **TypeScript / Node.js** plutôt que Python.

Raison :

* Stagehand v3 est particulièrement bien documenté côté TypeScript ;
* les exemples officiels utilisent le SDK :

```typescript
import { Stagehand } from "@browserbasehq/stagehand";
```

* l'intégration Playwright est native ;
* `stagehand.context.pages()[0]` permet d'accéder directement à la page Playwright ;
* `stagehand.act()` permet d'exécuter des instructions en langage naturel.

Le SDK Python existe également, mais ce POC doit privilégier la voie TypeScript pour minimiser les incertitudes liées à la version actuelle de Stagehand.

---

# 4. Pré-requis

Installer :

* Node.js 20+ ou version actuellement recommandée par Stagehand ;
* npm ;
* Chrome ou Chromium.

Créer le projet :

```bash
mkdir stagehand-youtube-local
cd stagehand-youtube-local

npm init -y
```

Installer Stagehand, Playwright et dotenv :

```bash
npm install @browserbasehq/stagehand playwright dotenv
npm install --save-dev typescript tsx @types/node
```

Créer un fichier :

```text
.env
```

avec :

```dotenv
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

**Ne pas ajouter de clé Browserbase.**

---

# 5. Configuration TypeScript

Créer `tsconfig.json` :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Modifier `package.json` :

```json
{
  "type": "module",
  "scripts": {
    "start": "tsx src/youtube.ts"
  }
}
```

Créer :

```bash
mkdir -p src
```

---

# 6. Implémentation recommandée

Créer :

```text
src/youtube.ts
```

avec le code suivant :

```typescript
import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY n'est pas définie dans l'environnement."
    );
  }

  const stagehand = new Stagehand({
    env: "LOCAL",

    /*
     * Ne pas utiliser l'API Browserbase.
     */
    disableAPI: true,

    /*
     * Navigateur local visible.
     */
    localBrowserLaunchOptions: {
      headless: false,
    },

    /*
     * Modèle Anthropic.
     */
    model: {
      modelName: "anthropic/claude-sonnet-4-6",
      apiKey: process.env.ANTHROPIC_API_KEY,
    },

    verbose: 2,
  });

  await stagehand.init();

  try {
    const page = stagehand.context.pages()[0];

    /*
     * Etape 1 :
     * ouverture déterministe de YouTube.
     */
    await page.goto("https://www.youtube.com/", {
      waitUntil: "domcontentloaded",
    });

    /*
     * Etape 2 :
     * attendre que la page soit stabilisée.
     */
    await page.waitForTimeout(2000);

    /*
     * Etape 3 :
     * utiliser Stagehand pour identifier le champ
     * de recherche YouTube et saisir "POE2".
     */
    await stagehand.act(
      'click on the YouTube search field and type "POE2"'
    );

    /*
     * Etape 4 :
     * lancer la recherche.
     */
    await stagehand.act(
      "press Enter in the YouTube search field"
    );

    /*
     * Etape 5 :
     * attendre l'affichage des résultats.
     */
    await page.waitForTimeout(3000);

    /*
     * Etape 6 :
     * demander à Stagehand d'ouvrir la première vidéo
     * affichée dans les résultats.
     */
    await stagehand.act(
      "click on the first video in the YouTube search results"
    );

    /*
     * Laisser le navigateur ouvert quelques secondes
     * pour constater le résultat.
     */
    await page.waitForTimeout(10000);

    console.log("Navigation terminée.");
    console.log("URL finale :", page.url());

  } finally {
    await stagehand.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

---

# 7. Exécution

Lancer :

```bash
npm start
```

Le comportement attendu est :

```text
Node.js
   │
   ▼
Stagehand v3
   │
   ├── env = LOCAL
   │
   ├── Browserbase API = désactivée
   │
   ├── Claude / Anthropic
   │
   └── Chrome/Chromium local
             │
             ▼
        youtube.com
             │
             ▼
          "POE2"
             │
             ▼
          Entrée
             │
             ▼
       résultats YouTube
             │
             ▼
      première vidéo
             │
             ▼
           lecture
```

---

# 8. Pourquoi utiliser `page.goto()` pour YouTube ?

L'ouverture de YouTube est parfaitement déterministe.

Il est donc préférable d'écrire :

```typescript
await page.goto("https://www.youtube.com/");
```

plutôt que de demander au LLM :

```text
Go to YouTube.
```

Stagehand recommande justement de combiner les actions Playwright déterministes avec les actions IA lorsque l'interface est moins prévisible.

L'architecture retenue est donc :

```text
ACTION DÉTERMINISTE
        │
        ▼
page.goto()
        │
        ▼
      YouTube
        │
        ▼
ACTION IA
        │
        ▼
stagehand.act()
        │
        ▼
recherche POE2
        │
        ▼
ACTION IA
        │
        ▼
première vidéo
```

---

# 9. Variante plus robuste : mélanger Playwright et Stagehand

Pour le scénario YouTube, il est possible de réduire encore l'utilisation du LLM.

Par exemple, Stagehand peut être utilisé pour identifier les éléments de manière intelligente, tandis que Playwright réalise les opérations simples.

Stagehand v3 est conçu pour fonctionner directement avec les objets `Page` de Playwright.

Une stratégie recommandée est :

```text
Stagehand
   │
   ├── page.goto()
   │
   ├── observe()
   │
   ├── act()
   │
   └── Playwright
```

Cela permet d'éviter de faire appel au LLM lorsqu'un sélecteur fiable est connu.

---

# 10. Variante avec `observe()`

Pour rendre le POC plus démonstratif des capacités de Stagehand, utiliser `observe()` avant l'action.

Exemple :

```typescript
const actions = await stagehand.observe(
  "find the YouTube search box"
);

console.log(actions);
```

Puis :

```typescript
await stagehand.act(
  "type POE2 into the YouTube search box"
);
```

Puis :

```typescript
await stagehand.act(
  "press Enter to search"
);
```

Et enfin :

```typescript
await stagehand.act(
  "click the first video in the search results"
);
```

`observe()`, `act()` et `extract()` sont les primitives IA principales de Stagehand v3.

---

# 11. Variante utilisant directement l'agent Stagehand

Une seconde implémentation à tester est le mode agentique :

```typescript
const agent = stagehand.agent({
  model: {
    modelName: "anthropic/claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
});

await agent.execute({
  instruction: `
    Go to https://www.youtube.com/.
    Search for "POE2".
    Press Enter.
    Open the first video in the search results.
  `,
  maxSteps: 10,
});
```

Cette variante est plus proche de l'objectif final d'un **agent autonome**.

Cependant, pour le premier POC, privilégier la version explicite :

```text
goto()
→ act()
→ act()
→ act()
```

car elle est plus déterministe et plus facile à diagnostiquer.

Stagehand recommande d'ailleurs de décomposer les workflows connus en `act`/`observe`/`extract` plutôt que d'utiliser systématiquement une boucle agentique opaque.

---

# 12. Point d'attention : `disableAPI`

Le POC doit conserver :

```typescript
disableAPI: true
```

ainsi que :

```typescript
env: "LOCAL"
```

L'objectif est de rendre explicite que le navigateur est local et que le scénario ne doit pas utiliser l'infrastructure Browserbase.

La configuration TypeScript actuelle de Stagehand expose bien `disableAPI` et `localBrowserLaunchOptions`.

---

# 13. Critères de succès

Le POC est considéré comme réussi si :

### Critère 1 — Browserbase

Aucune variable :

```text
BROWSERBASE_API_KEY
BROWSERBASE_PROJECT_ID
```

n'est nécessaire.

---

### Critère 2 — navigateur

Une fenêtre Chrome/Chromium est réellement ouverte sur la machine locale.

---

### Critère 3 — YouTube

Le navigateur atteint :

```text
https://www.youtube.com/
```

---

### Critère 4 — recherche

Le programme saisit :

```text
POE2
```

dans le champ de recherche YouTube.

---

### Critère 5 — recherche

Le programme valide la recherche avec :

```text
Enter
```

---

### Critère 6 — sélection

La première vidéo des résultats est sélectionnée.

---

### Critère 7 — lecture

La vidéo est ouverte et sa page de lecture est affichée.

---

### Critère 8 — Anthropic

Les opérations IA utilisent :

```text
ANTHROPIC_API_KEY
```

et aucun fournisseur LLM supplémentaire.

---

# 14. Vérification de l'absence de Browserbase

L'agent d'implémentation devra vérifier le code source et l'environnement afin de confirmer qu'aucun appel Browserbase n'est nécessaire.

Le projet doit notamment pouvoir être lancé avec uniquement :

```dotenv
ANTHROPIC_API_KEY=...
```

et sans :

```dotenv
BROWSERBASE_API_KEY=...
BROWSERBASE_PROJECT_ID=...
```

---

# 15. Architecture finale recherchée

Le résultat doit être :

```text
                    ┌──────────────────────┐
                    │       Script         │
                    │     TypeScript       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Stagehand v3      │
                    │                      │
                    │      env: LOCAL      │
                    │    disableAPI: true  │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
       ┌──────────────────┐         ┌──────────────────┐
       │ Chrome/Chromium  │         │ Anthropic Claude │
       │      LOCAL       │         │                  │
       │                  │         │ ANTHROPIC_API_KEY│
       └────────┬─────────┘         └──────────────────┘
                │
                ▼
             YouTube
                │
                ▼
             "POE2"
                │
                ▼
          première vidéo
                │
                ▼
             lecture
```

---

# 16. Résultat attendu du POC

La commande finale doit être simplement :

```bash
npm start
```

avec uniquement :

```dotenv
ANTHROPIC_API_KEY=...
```

dans `.env`.

Le navigateur doit alors :

```text
1. s'ouvrir localement
2. ouvrir YouTube
3. saisir "POE2"
4. appuyer sur Entrée
5. attendre les résultats
6. sélectionner la première vidéo
7. ouvrir la vidéo
```

Aucune session Browserbase ne doit être créée.

Aucun navigateur distant Browserbase ne doit être utilisé.

---

# 17. Évolution possible après validation

Une fois ce POC fonctionnel, le deuxième niveau pourra consister à transformer le scénario en véritable agent :

```text
                 Agent Stagehand
                       │
                       ▼
                 Instructions
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       observe()     act()       extract()
          │            │            │
          └────────────┼────────────┘
                       ▼
                  Playwright
                       │
                       ▼
                Chrome LOCAL
```

Puis à intégrer progressivement :

* mémoire ;
* outils ;
* MCP ;
* orchestration ;
* gestion des erreurs ;
* boucle agentique ;
* limites `maxSteps` ;
* observabilité ;
* évaluation ;
* garde-fous ;
* validation humaine ;
* routage entre modèles Claude/cloud et modèles locaux.

L'objectif à terme est de disposer d'un composant **Browser Agent local** intégrable dans une architecture agentique plus large.

