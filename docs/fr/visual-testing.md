[English](../en/visual-testing.md) · [Français](../fr/visual-testing.md) · [Accueil](../../README.fr.md)

# Régression visuelle avec Playwright

Ces tests comparent le rendu de l’application et de Storybook à des références PNG relues et suivies dans `visual/baselines/`. Ils complètent les tests unitaires et les parcours fonctionnels. Les galeries historiques `docs/screenshots/` sont des images de présentation, pas les références de régression.

## Lancer les comparaisons

Utiliser Node et npm comme indiqué dans le [guide développeur](development.md). Installer Chromium une fois :

```powershell
npm ci
npm exec playwright install chromium
npm run visual:typecheck
npm run test:visual
npm run test:visual:report
```

La commande recompile Angular et Storybook, puis démarre des serveurs statiques dédiés sur les ports **4310** et **4311**. Garder ces ports libres. Elle ne réutilise ni l’application sur 4200 ni Storybook sur 6007. Les serveurs de test s’arrêtent après le parcours. Aucun serveur de développement n’est à lancer manuellement.

Une référence absente ou une différence excessive de pixels fait échouer le test. Le mode comparaison ne crée ni ne remplace les références. Le rapport HTML dans `playwright-report/visual/` montre les images attendues, obtenues et leurs différences. Les artefacts d’échec et traces sont stockés dans `test-results/visual/` ; ces deux dossiers sont ignorés par Git.

## Couverture

| Zone                        | Couverture                                                                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application responsive      | 402 × 874, 834 × 1194, 1512 × 982 et 1920 × 1080 ; chaque format en français/anglais et clair/sombre. Accueil, véritable diorama WebGL et éditeur JSON valide.                                                                          |
| Détails des fonctionnalités | Mobile et desktop en français/clair et anglais/sombre : comparaison de scénario et catégories, paramètres d’appareil, puissance simulée, tarif HP/HC, palette et bibliothèque complète.                                                 |
| États particuliers          | Logement vide sur desktop ; WebGL indisponible et liste accessible des appareils sur mobile.                                                                                                                                            |
| Storybook                   | Toutes les stories actuelles à 1200 × 900 en français/clair/forêt et anglais/sombre/lavande, après la fin des assertions play. Fondations, boutons, icônes, cartes, formulaires, erreurs JSON, sauvegarde et tous les états du diorama. |

Le test d’inventaire Storybook échoue si une story est ajoutée ou retirée sans mettre à jour `visual/storybook.visual.spec.ts`. Certains tests détaillés sont volontairement ignorés aux formats intermédiaires ; les cas responsives couvrent toujours les quatre dimensions.

Les captures d’accueil prennent le viewport. Les captures détaillées prennent le composant entier (qui peut dépasser la hauteur du viewport), et celles du JSON, de la palette ou du tarif incluent la vraie fenêtre modale et son arrière-plan. Le canvas WebGL est comparé, sans masque ni remplacement. Ce sont des vérifications Chromium, pas des tests sur appareils Apple physiques, Safari ou WebView2 natif.

## Reproductibilité

La fixture crée un processus Chromium et un contexte de stockage distincts pour chaque test. Elle prépare IndexedDB **avant le démarrage d’Angular**, avec des identifiants fixes et un scénario d’économie indépendant. Thème, accent, langue et UUID générés sont contrôlés. Elle ne charge jamais les données de l’application de l’utilisateur.

Les tests bloquent les service workers et utilisent un ratio de pixels de 1, des mouvements réduits, une composition logicielle et WebGL SwiftShader. Ils attendent les polices, l’état enregistré, les libellés, la fin des interactions Storybook et la stabilisation de la page. Les effets de survol et du curseur de saisie sont retirés avant comparaison ; les animations des captures sont désactivées. Un rendu WebGL absent fait échouer les cas 3D normaux, sans accepter silencieusement le repli.

Les comparaisons tolèrent au maximum **100 pixels modifiés**, avec un seuil de couleur par pixel de **0,15**. Les stories d’icônes ne tolèrent aucun pixel modifié, afin de protéger les petits pictogrammes. Les débordements horizontaux et erreurs navigateur non interceptées font aussi échouer les tests. Playwright attend des images consécutives stables. Consulter le [guide officiel des comparaisons visuelles](https://playwright.dev/docs/test-snapshots).

Les références sont séparées par plateforme et projet : `visual/baselines/win32/app-iphone/app.visual.spec.ts/`, par exemple. Les références fournies ont été générées localement sous Windows avec la version Chromium installée depuis le verrou npm. Les polices et rendus diffèrent selon le système ; Linux/macOS demandent leurs propres références relues. Garder des versions npm/navigateur et un environnement de capture cohérents. La CI Windows peut encore montrer des différences avec le Windows local ; examiner ces différences avant de les accepter.

## Relire une modification volontaire

Commencer par le mode comparaison et examiner le rapport. Si la modification de l’interface est voulue, mettre à jour uniquement les tests concernés :

```powershell
npm run test:visual:update -- --project=app-iphone --grep "responsive fr light"
npm run test:visual:update -- --project=storybook --grep "components-button"
```

Pour une régénération complète volontaire :

```powershell
npm run test:visual:update
```

Relire chaque PNG modifié dans le diff Git ou une visionneuse. Vérifier disposition, texte, éléments coupés, contraste, alignement des fenêtres et contenu 3D. Inclure les références approuvées dans le même commit que le changement de code, puis relancer `npm run test:visual` sans mise à jour. Ne pas régénérer les références uniquement pour masquer un échec inattendu.

Pour une comparaison plus rapide lorsque les deux compilations sont déjà à jour :

```powershell
npm exec playwright test -- -c playwright.visual.config.ts --project=app-desktop
```

Cette commande directe évite volontairement la compilation. Le script npm habituel recompile toujours. Un `PLAYWRIGHT_BROWSERS_PATH` personnalisé doit correspondre au chemin d’installation de Chromium ; voir les [instructions sur les caches](development.md).

## GitHub Actions

`.github/workflows/visual-regression.yml` s’exécute pour les pull requests concernées et sur lancement manuel, avec Windows 2025 et `npm ci`. Il vérifie les types, compile les deux cibles et compare les références sans les modifier. Le rapport HTML, les différences et les traces sont conservés dans l’artefact `visual-regression-report` pendant 14 jours, y compris en cas d’échec.

Le workflow est fourni dans le dépôt ; un parcours local ne valide pas le runner hébergé et ne publie rien. Tout changement de navigateur, de polices ou d’image du runner demande une comparaison et une revue volontaires des références.
