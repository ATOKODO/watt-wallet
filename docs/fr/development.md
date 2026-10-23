[English](../en/development.md) · [Français](../fr/development.md) · [Accueil](../../README.fr.md)

# Guide développeur

Watt Wallet utilise Angular 22 avec composants standalone, formulaires réactifs et Signals. Three.js rend directement le diorama. Tauri 2 fournit l’application Windows et le stockage natif. Le domaine est indépendant d’Angular et du rendu ; aucun serveur métier ni télémétrie n’est utilisé.

## Prérequis et installation

Utiliser Node **24.15+ dans la branche 24.x** et npm. La validation locale enregistrée utilisait Node 24.20. Installer les dépendances verrouillées avec `npm ci`.

Pour Windows, utiliser Rust stable avec la chaîne MSVC, Visual Studio C++ Build Tools avec les outils de bureau C++, Windows SDK et WebView2. Windows x64 est la cible native validée. Les installateurs macOS/Linux ne font pas partie de la livraison actuelle.

```powershell
npm ci
npm start
```

Le serveur web écoute sur [http://127.0.0.1:4200](http://127.0.0.1:4200). Pour Tauri, arrêter un serveur de développement lancé manuellement et utiliser :

```powershell
npm run desktop
```

Tauri exécute lui-même le `beforeDevCommand` configuré. Un lancement normal ouvre l’espace de travail local. Utiliser les profils isolés des tests automatisés pour les données de test destructives plutôt qu’un espace de travail personnel.

## Compilations et fonctionnement hors connexion

```powershell
npm run build
npm run desktop:build
```

La version web est produite dans `dist/watt-wallet/browser`. La servir avec un serveur HTTP statique sur localhost ou HTTPS, avec repli SPA vers `index.html` si l’hébergement le nécessite. Ne pas l’ouvrir avec `file://`.

La version navigateur de production enregistre immédiatement un service worker Angular. Son groupe préchargé inclut l’application, le JavaScript, le CSS, le favicon et le manifeste web. Après un premier chargement complet et l’installation, la même origine peut être rouverte hors connexion. Le mode développement et Tauri désactivent ce service worker. Les données restent séparées pour chaque origine et profil de navigateur.

La commande Windows compile le frontend et crée un installateur NSIS dans `src-tauri/target/release/bundle/nsis`, actuellement nommé `Watt Wallet_0.1.0_x64-setup.exe`. L’installation est par utilisateur, en français et sans signature commerciale. WebView2 est téléchargé s’il manque ; ce parcours nécessite Internet. L’application conserve ses deux langues.

L’inlining du CSS critique Angular est désactivé car le gestionnaire `onload` de sa feuille différée est incompatible avec la CSP de scripts Tauri. Les styles chargent comme feuilles externes et la politique de scripts reste stricte. L’interception native du dépôt de fichiers dans la WebView est désactivée pour permettre le glisser-déposer HTML des appareils sous Windows ; les imports utilisent des sélecteurs dédiés.

## Netlify : application web uniquement

Le fichier racine `netlify.toml` publie uniquement la compilation Angular pour navigateur. Dans Netlify, importer ce dépôt, conserver le répertoire de base à la racine et utiliser la configuration du fichier :

| Paramètre               | Valeur                                        |
| ----------------------- | --------------------------------------------- |
| Commande de compilation | `npm run build -- --configuration production` |
| Dossier publié          | `dist/watt-wallet/browser`                    |
| Node.js                 | `24.20.0`                                     |

Netlify installe les dépendances npm avant cette commande ; les dépendances de développement restent activées car le compilateur Angular en a besoin. Documentation, Storybook, captures et binaires Windows sont hors du dossier publié. Le déploiement utilise des fichiers statiques, sans serveur, Functions ni base de données à provisionner. Aucun secret applicatif n’est nécessaire.

Le repli SPA conserve les ressources existantes et sert `index.html` pour les adresses de l’application. Le point d’entrée HTML, le manifeste du service worker et le worker doivent être revalidés pour éviter de conserver une ancienne version.

`scripts/netlify-ignore-build.mjs` compare le commit précédemment déployé au commit demandé. Les changements limités à la documentation, aux stories/configurations Storybook, aux tests ou à Tauri ne recompilent pas l’application. Le code applicatif, les ressources publiques, les dépendances npm partagées, les configurations Angular/TypeScript et Netlify déclenchent une compilation. Garder les chemins surveillés conformes aux futures entrées de compilation. Un premier déploiement, un redéploiement explicite du même commit ou une comparaison Git indisponible poursuivent la compilation. Les build hooks Netlify peuvent contourner cette règle d’annulation.

Après déploiement, vérifier l’adresse publique, le rechargement, la vue 3D, la sauvegarde locale et l’import/export `.wattpack`. Les données appartiennent à chaque profil et origine de navigateur ; un Deploy Preview, le domaine de production et un nouveau domaine personnalisé ont des stockages séparés. Exporter/importer pour transférer un logement entre eux. L’ajout de cette configuration ne publie pas encore le site.

Voir la [configuration par fichier](https://docs.netlify.com/build/configure-builds/file-based-configuration/) et les [règles d’annulation de compilation](https://docs.netlify.com/build/configure-builds/ignore-builds/) Netlify.

## Architecture et flux de données

| Partie             | Responsabilité                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/domain`   | Contrats Zod/TypeScript, énergie annuelle, calcul tarifaire, comparaisons, puissance temporaire et données génériques initiales.     |
| `src/app/data`     | Dépôts de stockage, sélection de fichiers web/native, validation `.wattpack` et contrôles GLB.                                       |
| `src/app/state.ts` | État de l’espace de travail avec Signals, résultats dérivés, mutations validées et sauvegardes sérialisées.                          |
| `src/app/scene`    | Silhouettes intégrées, chargement GLB validé, grille adaptative, caméra et interactions.                                             |
| `src/app/ui`       | Éditeur de fiche, icônes, traduction, thème et palette.                                                                              |
| `src-tauri/src`    | Opérations natives sur l’espace de travail et les ressources, remplacement atomique et protection contre les écritures concurrentes. |

Les formulaires produisent des fiches, usages ou tarifs validés. Le store copie l’espace de travail avant une mutation, le valide, actualise ses Signals et met la sauvegarde en file d’attente. Les calculs dérivés alimentent l’interface et la scène. Three.js n’est jamais la source des données d’énergie ou d’équipement.

Les contrats principaux sont `DeviceDefinition`, `DeviceInstance`, `UsageProfile`, `Tariff`, `Home`, `Scenario` et `CalculationResult`. Une instance embarque une copie de sa fiche ; un scénario embarque ses appareils et son tarif. Consulter le [contrat d’échange](wattpack.md) et les [règles de calcul](calculations.md).

Les points d’entrée du domaine comprennent `annualBreakdown(device)`, `calculate(snapshot)`, `compare(reference, scenario, initialCost)` et `powerEstimate(device, state)`. Les résultats sont recalculés, pas persistés. Les états simulés sont des données de session, identifiées par logement, référence/scénario et appareil ; ils n’appartiennent pas au format public.

La scène orthographique normalise les boîtes englobantes. L’espacement suit les empreintes X/Z affichées et les limites du plateau s’adaptent au nombre d’objets et à leurs positions. Le rendu est demandé lors des mises à jour, interactions et commandes, sans boucle d’animation permanente au repos. Les ressources intégrées sont partagées ; la scène libère les ressources des modèles retirés.

## Stockage, ressources et récupération

| Environnement           | Stockage                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Navigateur              | Base IndexedDB `watt-wallet`, stores `workspace` et `assets` ; clé d’espace de travail `current`. |
| Windows                 | Dossier applicatif de `app.wattwallet.desktop`, contenant `workspace.json` et `assets/*.glb`.     |
| Préférences d’interface | Clés de stockage local `watt-wallet-language`, `watt-wallet-theme`, `watt-wallet-accent`.         |

L’interface du dépôt fournit `load`, `save`, `getAsset` et `putAsset`. Le stockage natif utilise les commandes Tauri ; le navigateur utilise des transactions IndexedDB. Le remplacement JSON natif écrit un fichier temporaire à côté de la destination, le synchronise puis le remplace atomiquement.

La sauvegarde compare la version précédente attendue à la version enregistrée. Les transactions navigateur et un verrou natif partagé protègent contre les écritures périmées. `WorkspaceConflictError` bloque les changements suivants jusqu’à récupération explicite. La copie locale reste disponible pour export ; recharger abandonne les changements locaux non sauvegardés après confirmation. Une erreur de chargement ne remplace pas une sauvegarde illisible par les données initiales.

Les échecs ordinaires conservent les modifications en mémoire et proposent une reprise. Les fenêtres de création/import réutilisent leurs identifiants et mappings de ressources préparés lors d’une reprise, sans multiplier logements, scénarios ou GLB. Un nouvel import confirmé crée volontairement de nouvelles copies.

Les octets GLB importés restent inchangés et ne sont exportés que si le paquet les référence. Remplacer ou retirer un visuel ne compacte pas le stockage en V1. Un paquet de logement n’est pas une sauvegarde complète de l’espace de travail : fiches inutilisées, autres logements et préférences nécessitent un traitement séparé.

## Traduction et apparence

L’application démarre en français sauf si l’anglais a été conservé localement. `LanguageService` expose des Signals de langue et de devise, les formats numériques `en-GB`/`fr-FR` et les montants EUR/USD. Le catalogue anglais est `src/app/ui/i18n/en.json`, avec les messages sources français comme clés. Le pipe standalone `t` traite les textes visibles, attributs accessibles et messages paramétrés tels que `{0}`.

Pour un nouveau texte utilisateur, utiliser le message français et ajouter sa traduction anglaise. Inclure noms accessibles, erreurs et notifications. Ne pas traduire identifiants, champs JSON, catégories du contrat ni noms et notes personnels. Les noms intégrés inchangés sont localisés à l’affichage et les contenus personnalisés sont conservés. Les tests de langue vérifient la couverture et les comportements.

Le thème initial suit le système ; un choix explicite le remplace localement. La palette teinte surfaces, commandes et plateau dans les deux modes. Garder les textes produit indépendants des détails d’implémentation et préserver les contrastes clair/sombre.

## Tests et contrôles

```powershell
npm test
npm exec playwright install chromium
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
npm run format:check
npx prettier --check README*.md docs/en docs/fr
```

La dernière commande inclut les guides bilingues et le README français, hors des motifs de documentation de premier niveau de `format:check`. Playwright démarre ou réutilise le serveur sur le port 4200 et utilise un seul worker. Les échecs conservent captures et traces dans `test-results/` ; certains parcours écrivent aussi des captures nommées de vérification.

Après compilation, utiliser les tests isolés de production et natifs :

```powershell
npm run build
npm run test:offline
npm run desktop:build
npm run test:native
```

Le script hors connexion sert la production sur le port 4301 et vérifie rechargement, stockage, anglais et 3D sans requêtes externes. Les tests natifs utilisent une fenêtre masquée avec `--smoke-test` et `WATT_WALLET_SMOKE_DIR` pour isoler données et profil WebView2 ; ce mode est inactif lors d’un lancement normal.

Pour vérifier le binaire installé sous Windows :

```powershell
powershell -NoProfile -File scripts/installer-smoke.ps1
```

Ce test installe le paquet NSIS dans un dossier unique `.cache/installer-smoke-*` sans raccourcis, vérifie le SHA-256 du binaire après normalisation du seul marqueur NSIS réservé par Tauri, exécute les contrôles WebView2 réels puis désinstalle le paquet temporaire. Il refuse de démarrer si Watt Wallet est déjà installé pour le compte courant.

Pour conserver les caches dans l’espace de travail, définir ces variables avant l’installation ou le téléchargement des dépendances concernées :

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/playwright'
$env:CARGO_HOME = Join-Path (Get-Location) '.cache/cargo'
npm exec playwright install chromium
```

Consulter le [rapport historique de vérification](verification.md) pour les résultats, dates et limites de couverture native. Il ne signifie pas que les tests ont été réexécutés à chaque modification documentaire.

## Exemples et captures fonctionnelles

```powershell
npm run examples
```

Cette commande régénère le schéma public et les paquets `.wattpack` de démonstration, avec des `.manifest.json` lisibles pour la bibliothèque et le logement. Elle écrit des artefacts suivis : contrôler le diff lors d’une mise à jour volontaire du format ou des exemples.

Démarrer l’application, puis utiliser les commandes de capture dans un autre terminal avec le runtime Playwright disponible :

```powershell
node scripts/screenshots-mobile.mjs
node scripts/screenshots-devices.mjs
node scripts/screenshots-devices.mjs ipad-pro-11 en
```

| Série           | Viewport    | Langues                                                      |
| --------------- | ----------- | ------------------------------------------------------------ |
| iPhone 16 Pro   | 402 × 874   | Parcours français historique avec une dernière vue anglaise. |
| iPad Pro 11″    | 834 × 1194  | Séries française et anglaise séparées.                       |
| MacBook Pro 14″ | 1512 × 982  | Séries française et anglaise séparées.                       |
| Desktop         | 1920 × 1080 | Séries française et anglaise séparées.                       |

La fonction de capture partagée utilise des contextes de démonstration isolés, un ratio de pixels de 1 et 21 captures de fonctionnalités par série. Les PNG, galerie, README et manifeste sont écrits dans `docs/screenshots`. Les identifiants d’appareil facultatifs sont `ipad-pro-11`, `macbook-pro-14` et `desktop` ; la langue facultative est `fr` ou `en`. `WATT_WALLET_URL` change l’URL cible. `WATT_WALLET_SOFTWARE_GPU=1` active l’option WebGL logiciel du script des grands formats si nécessaire.

Les scripts attendent les polices et la stabilisation de l’interface, contrôlent les dimensions PNG et les débordements horizontaux ; la fonction partagée refuse les captures avec repli sans WebGL. Ils écrivent des images et documents suivis dans Git. Examiner les [galeries](../screenshots/README.md) après régénération. Les noms de viewport décrivent des dispositions, pas une couverture native Safari, iOS ou macOS.

## Site de documentation

La documentation est un site statique VitePress séparé ; elle ne lit pas les données de l’application et n’a pas besoin de lancer Angular ou Tauri. Les mêmes fichiers Markdown de `docs/en/` et `docs/fr/` fonctionnent sur GitHub et dans le site. Le rendu adapte les liens du dépôt vers les ressources téléchargeables et les routes du navigateur sans modifier les guides sources. La navigation, la recherche et l’apparence sont configurées dans `docs/.vitepress/config.mts` et `docs/.vitepress/theme/`. La version de VitePress est fixée dans `package.json` ; vérifier la compilation et la navigation lors d’une mise à jour.

```powershell
npm run docs:dev
```

Ouvrir [Français](http://127.0.0.1:5173/fr/) ou [English](http://127.0.0.1:5173/en/). Le serveur recharge les pages après modification du Markdown. Il peut fonctionner en parallèle de l’application sur le port 4200. La barre latérale donne accès à chaque fonctionnalité ; l’en-tête propose langue, recherche locale et thème. Ces préférences documentaires sont indépendantes de l’application.

```powershell
npm run docs:build
npm run test:docs -- --static
npm run test:docs
npm run docs:preview
```

La compilation produit `docs/.vitepress/dist` ; l’aperçu écoute sur [http://127.0.0.1:4173](http://127.0.0.1:4173). `scripts/docs-assets.mjs` copie captures, galeries HTML, exemples, schéma JSON et favicon avant le développement/la compilation dans un dossier public ignoré par Git. Aucune copie des ressources sources n’est à maintenir. Publier le dossier de sortie complet. La documentation n’installe pas le service worker hors connexion de l’application.

Le contrôle statique vérifie liens internes, ancres et ressources générés. Le contrôle complet utilise en plus un contexte Chromium isolé pour vérifier navigation française/anglaise, recherche, changement de langue, thèmes, téléchargement des paquets et menu mobile. Installer son runtime avec `npm exec playwright install chromium` si nécessaire. Les captures de contrôle sont écrites dans le dossier ignoré `.cache/docs-review/`. Vérifier le formatage avec :

```powershell
npx prettier --check README*.md docs/en docs/fr docs/index.md docs/.vitepress/config.mts docs/.vitepress/theme scripts/docs-*.mjs .github/workflows/docs-pages.yml
```

### GitHub Pages

Le workflow fourni `.github/workflows/docs-pages.yml` compile, vérifie les liens et publie la documentation après les changements concernés poussés sur `master`, ou sur lancement manuel depuis Actions. Dans **Settings → Pages → Build and deployment → Source** du dépôt, sélectionner **GitHub Actions** avant de l’exécuter. Ajouter le workflow localement ne publie pas de site et ne modifie pas les paramètres du dépôt. Consulter les [instructions GitHub pour un workflow Pages personnalisé](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) et le [guide de publication VitePress](https://vitepress.dev/guide/deploy).

Le workflow fournit le chemin de base réel de Pages via `DOCS_BASE_PATH`, qu’il s’agisse d’un sous-chemin de dépôt ou de la racine d’un domaine personnalisé. Le site utilise des routes explicites en `.html` : les liens directs vers les guides ne nécessitent pas de repli SPA. Pour vérifier un sous-chemin localement, garder la même base pour la compilation, les tests et l’aperçu :

```powershell
$env:DOCS_BASE_PATH = '/watt-wallet/'
npm run docs:build
npm run test:docs
npm run docs:preview
```

Ouvrir `http://127.0.0.1:4173/watt-wallet/fr/` ou son équivalent anglais. Après arrêt de l’aperçu, utiliser `Remove-Item Env:DOCS_BASE_PATH` puis recompiler pour revenir à un hébergement à la racine. La base par défaut est `/`. Ce site publie la documentation et les exemples téléchargeables ; l’application Angular conserve sa compilation et ses besoins d’hébergement propres.

## Design system et composants

Consulter le [guide Storybook](design-system.md) pour les tokens partagés, le catalogue des composants de production, les providers isolés et les contrôles d’interaction. Lancer le catalogue avec `npm run storybook` sur le port 6007 ; le compiler avec `npm run storybook:build`.

## Régression visuelle

Lancer `npm run test:visual` pour comparer l’application et Storybook à des références PNG suivies. Examiner les différences avec `npm run test:visual:report` ; approuver volontairement les changements avec `npm run test:visual:update`. Consulter le [guide de régression visuelle](visual-testing.md) pour les formats, thèmes, données isolées, références Windows et GitHub Actions.
