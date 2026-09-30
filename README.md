# Watt Wallet

Une application locale pour composer son logement, visualiser la consommation de ses appareils dans un diorama isométrique et comparer des scénarios. Angular 22, Three.js et Tauri 2. Interface française, euros, sans compte, serveur métier ni télémétrie.

## Démarrer

Prérequis : Node 24.15+ (branche 24), npm. Pour Windows : Rust stable MSVC, Visual Studio C++ Build Tools, Windows SDK et WebView2.

```powershell
npm ci
npm start
```

Ouvrir `http://127.0.0.1:4200`. Le premier lancement propose un logement de démonstration et 14 fiches génériques. Les prix et consommations sont des exemples modifiables, pas des caractéristiques constructeur ni des tarifs officiels.

```powershell
npm run desktop          # application Tauri en développement
npm run build            # SPA dans dist/watt-wallet/browser
npm run desktop:build    # installateur NSIS dans src-tauri/target/release/bundle/nsis
```

La version web compilée peut être servie par un serveur statique sur localhost ou HTTPS. Son service worker conserve l’application après une première ouverture complète : elle peut ensuite être rouverte hors connexion sur la même origine. Le mode développement ne met pas les fichiers en cache. Ne pas ouvrir directement `index.html` avec `file://`.

L’application Windows fonctionne hors connexion. L’installateur télécharge WebView2 si le runtime est absent : dans ce cas, la première installation nécessite Internet. L’exécutable n’est pas signé avec un certificat commercial.

## Utilisation

Le bouton lune/soleil dans l'en-tête active le mode sombre ou clair. Le premier affichage suit la préférence du système ; votre choix est ensuite conservé localement. Le bouton palette voisin propose six couleurs et un sélecteur personnalisé. La couleur teinte les surfaces, les commandes et le plateau 3D dans les deux modes ; les nuances conservent leur luminosité pour rester lisibles. Cette préférence est conservée sur cet appareil.

- Ajouter un appareil par le bouton + ou glisser-déposer. Cliquer sur l’objet, son étiquette ou sa ligne pour ouvrir les paramètres. Le bouton « Retirer » de chaque ligne agit uniquement sur le logement ou le scénario affiché.
- Passer en **Placement** pour organiser le plateau avec des tailles uniformes. Le mode **Consommation** fait varier le volume de la boîte englobante selon la part des kWh/an. Les pourcentages chiffrés sont exacts ; les appareils à zéro deviennent de petits repères gris.
- « Ranger en grille » répartit les objets selon leur taille affichée. L’accrochage, activé au départ, place les objets déplacés sur la cellule libre la plus proche ; il peut être désactivé. Si les objets ne tiennent pas sur le plateau, aucune position n’est modifiée et un message l’explique.
- Faire glisser le décor avec le bouton gauche pour orbiter autour du logement, utiliser le bouton droit pour déplacer la vue et la molette pour zoomer. Sur écran tactile, un doigt fait orbiter ; deux doigts déplacent et zooment. Un appareil se déplace en le faisant glisser directement. Les coordonnées X/Z du formulaire permettent aussi un placement au clavier.
- Créer ou éditer les fiches de bibliothèque avec le formulaire ou l’onglet JSON synchronisé. L’exemple montre tous les champs attendus, le statut distingue syntaxe et valeurs invalides, et l’aperçu calcule la consommation annuelle. Un JSON incomplet ne peut pas être enregistré. Chaque appareil installé conserve sa copie de la fiche.
- Ajuster le tarif en bas du logement : Base ou HP/HC, prix TTC et abonnement annuel. En HP/HC, renseigner la part de consommation en heures creuses pour chaque appareil.
- Créer un scénario depuis la référence ou un scénario existant. Il est toujours comparé à la référence actuelle du logement. Son surcoût initial sert au calcul du retour simple, sans financement ni actualisation.
- Exporter une fiche, la bibliothèque ou le logement avec tous ses scénarios. Importer un `.wattpack` affiche un aperçu avant d’ajouter de nouvelles copies.
- Importer un GLB dans une fiche pour remplacer sa silhouette. Utiliser un GLB 2 autonome, géométrie et textures PNG/JPEG embarquées, sans Draco/Meshopt/KTX2. L’aperçu est statique.
- Dans « Puissance simulée maintenant », passez chaque groupe d’appareils entre Arrêt, Veille et En marche. Le total en W/kW est temporaire, sans mesure en direct ni effet sur les kWh/an. Une puissance inconnue est signalée et exclue du total ; renseignez les watts de simulation dans la fiche si nécessaire.
- Ouvrez « Comprendre cette estimation » dans le panneau de l’appareil pour retrouver fonctionnement, veille, quantité et coût. Vous pouvez aussi saisir les kWh de 12 mois de factures pour comparer votre logement de référence au réel ; ce repère est inclus dans son export.

## Calculs

- Puissance : watts moyens × heures/jour × jours/an ÷ 1 000.
- Cycles : kWh/cycle × cycles/semaine × 52.
- Valeur annuelle : kWh/an tout compris, sans ajout de veille.
- Pour les deux premières méthodes, la veille s’applique à `8 760 − heures actives`, y compris hors saison. Mettre la veille à zéro pour un appareil débranché sur ces heures. La durée du cycle est obligatoire si sa veille est non nulle.
- La quantité multiplie la consommation totale. La fraction HC s’applique à toute cette énergie ; elle vaut 0 % par défaut. Le reste est facturé en HP.
- L’abonnement entre dans le total de la facture, jamais dans les parts des appareils. Le mensuel est l’annuel divisé par douze. Aucun arrondi intermédiaire.
- Le chauffage est un usage explicite, sans modèle thermique, météo ou calcul par température. Les données ne sont pas une prédiction de facture réelle.

## Données et architecture

`src/app/domain` contient les contrats Zod/TypeScript et le moteur pur. `data` valide les GLB et les archives, et fournit les adaptateurs de stockage. `state.ts` orchestre les Signals et les sauvegardes sérialisées. `scene` gère uniquement le rendu et les interactions. Le frontend n’envoie aucune donnée à un service distant.

L’inlining du CSS critique Angular est désactivé en production : son chargement différé utilise un gestionnaire HTML `onload`, incompatible avec la CSP stricte de Tauri. Le CSS est chargé comme une feuille externe ; la protection des scripts est conservée.

L’interception native des fichiers glissés dans la WebView est désactivée pour laisser fonctionner le glisser-déposer HTML des appareils sous Windows. L’import de fichiers passe par les sélecteurs dédiés.

Navigateur : IndexedDB `watt-wallet`, stores `workspace` et `assets`, propres à l’origine du site. Windows : dossier applicatif `app.wattwallet.desktop` sous AppData, avec `workspace.json` et `assets/*.glb`. Les écritures natives utilisent un fichier temporaire dans le même dossier, synchronisé puis remplacé atomiquement. Une erreur de chargement n’écrase pas la sauvegarde existante. Exporter régulièrement un `.wattpack` pour sauvegarder hors du profil de l’application.

Les ressources GLB importées puis retirées d’une fiche peuvent rester dans le stockage local ; elles ne sont pas exportées si aucune fiche du paquet ne les référence. La V1 ne propose pas encore de compactage de ce stockage.

Format : [documentation](docs/wattpack.md), [schéma JSON](docs/wattpack.schema.json), [exemples](examples/). `npm run examples` régénère le schéma et les paquets de démonstration.

## Vérification

```powershell
npm test
npm exec playwright install chromium
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
npm run test:offline       # après npm run build
npm run test:native        # après npm run desktop:build, Windows / WebView2
npm run format:check
```

Dans un environnement restreint, les caches peuvent être placés dans le projet :

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache\playwright'
$env:CARGO_HOME = Join-Path (Get-Location) '.cache\cargo'
```

Les tests couvrent les formules, les valeurs invalides, la séparation abonnement/consommation, les scénarios, les limites d’archives, les ressources externes, les copies à l’import, le parcours navigateur et le mode sans WebGL. Les captures sont produites dans `test-results/`.

`scripts/installer-smoke.ps1` vérifie l’installateur Windows : installation silencieuse sans raccourcis dans un dossier unique `.cache/installer-smoke-*`, comparaison SHA-256 du binaire en tenant compte uniquement du marqueur NSIS injecté par Tauri, test WebView2, puis désinstallation. Il refuse de s’exécuter si Watt Wallet est déjà installé. Le test natif utilise `--smoke-test` avec `WATT_WALLET_SMOKE_DIR` pour masquer la fenêtre et isoler les données et le profil WebView2 ; ce mode n’est jamais activé au lancement normal.

Hors V1 : catalogue en ligne, comptes, Linky, scan d’étiquette, éditeur de géométrie, calcul thermique et tarifs calendaires comme Tempo.
