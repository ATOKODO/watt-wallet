[English](../en/design-system.md) · [Français](../fr/design-system.md) · [Accueil](../../README.fr.md)

# Design system et Storybook

Storybook est le catalogue interactif des composants Angular de Watt Wallet utilisés en production. Il rassemble les fondations visuelles, les exemples modifiables, la documentation automatique des API, les événements émis et l’inspection d’accessibilité. Il fonctionne indépendamment de l’application, de Tauri et du site documentaire.

## Ouvrir le catalogue

```powershell
npm ci
npm run storybook
```

Ouvrir [http://127.0.0.1:6007](http://127.0.0.1:6007). La barre latérale propose trois sections :

| Section       | Couverture                                                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design system | Introduction, couleurs sémantiques réelles, six accents, typographie, espacements et formes.                                                                                                                                            |
| Components    | Boutons natifs, catalogue complet des icônes SVG et cartes d’estimation annuelle/mensuelle.                                                                                                                                             |
| Features      | Le véritable éditeur d’appareil avec les méthodes puissance/cycle/annuelle, l’édition d’instance, la validation JSON et la sauvegarde ; le diorama Three.js en consommation, placement, sélection, logement vide et consommation nulle. |

Les commandes **Theme**, **Palette** et **Language** permettent d’inspecter clair/sombre, six couleurs et français/anglais. **Controls** modifie les entrées du composant ; **Actions** affiche les événements comme la soumission, la sélection ou le rangement en grille. Le menu des viewports propose 402 × 874, 834 × 1194 et 1512 × 982. Les fondations et descriptions techniques sont rédigées en anglais ; les composants de production utilisent leur véritable catalogue de traduction. Les chaînes saisies par l’utilisateur, notamment les valeurs de cartes déjà formatées, restent inchangées.

Le panneau Accessibility utilise axe pour inspecter le rendu. Les résultats sont indicatifs (`a11y.test: 'todo'`) et ne signifient pas que toutes les combinaisons existantes de couleurs/textes satisfont WCAG. Vérifier aussi le clavier, le contraste et le contexte de l’application complète.

## Sources partagées

| Source                                | Rôle                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/app/ui/design-system/tokens.css` | Variables de palette dans les deux thèmes, police, espacements et rayons.                    |
| `src/styles.css`                      | Styles des composants de production et règles adaptatives, également importés par Storybook. |
| `src/app/ui/palette.ts`               | Six couleurs, validation et teinte OKLCH partagée entre CSS et Three.js.                     |
| `src/app/ui/design-system/button.ts`  | `ButtonDirective` sur les boutons natifs de l’application et de l’éditeur.                   |
| `src/app/ui/design-system/metric.ts`  | `MetricComponent` utilisé par les trois cartes de synthèse de l’application.                 |
| `src/app/ui/icon.ts`                  | Icônes et liste exportée `iconNames` ; la galerie suit le registre réel.                     |
| `src/stories/*.stories.ts`            | Exemples typés et assertions d’interaction.                                                  |
| `.storybook/`                         | Framework Angular avec Vite, providers, barre d’outils globale, viewports et présentation.   |

L’application et Storybook partagent les composants et styles. Éviter une seconde implémentation visuelle dans le catalogue. `ButtonDirective` conserve les comportements natifs de clic, clavier, désactivation et formulaire. `MetricComponent` reçoit des données déjà formatées/traduites sans calcul ni sauvegarde. Une carte reste un `article` pour préserver la disposition et la sémantique.

Storybook 10.6.1 utilise `@storybook/angular-vite` avec le rendu sans Zone.js d’Angular 22. Ce framework est actuellement en preview ; les versions sont fixées et doivent être mises à jour ensemble, avec vérifications de compilation, types et navigateur. Consulter la [documentation officielle du framework](https://storybook.js.org/docs/get-started/frameworks/angular-vite).

## Données isolées

`.storybook/environment.ts` remplace `WalletStore` par un petit provider de démonstration. Il fournit un dépôt de ressources en mémoire et un logement exemple. Il n’instancie jamais le véritable store et n’ouvre pas son espace de travail IndexedDB. Les services de langue et thème reprennent le formatage et la palette de production avec des Signals de session ; ils n’écrasent pas les préférences de l’application.

Soumettre l’éditeur émet un brouillon validé dans Actions. Les octets GLB importés restent dans la mémoire du provider. Déplacer ou ranger le diorama émet des positions dans Actions sans les enregistrer. Three.js reste le véritable moteur : WebGL est nécessaire pour la scène, et le repli de production apparaît lorsqu’il est indisponible.

## Ajouter ou modifier un composant

1. Modifier les tokens, styles ou composants de production. Conserver focus visible, libellés accessibles et sémantique native.
2. Ajouter un `Meta` et un `StoryObj` typés dans `src/stories/<name>.stories.ts`, importés depuis `@storybook/angular-vite`.
3. Importer les dépendances standalone avec `moduleMetadata` si un template personnalisé en a besoin. Fournir un template explicite pour les sélecteurs d’attribut, comme dans les stories bouton/carte.
4. Définir des valeurs représentatives, des contrôles modifiables et des événements `fn()` depuis `storybook/test`. Ajouter les états vides, désactivés, occupés ou invalides utiles.
5. Ajouter une fonction `play` pour les interactions importantes avec `userEvent` et `expect`. Réutiliser les providers isolés plutôt qu’activer la sauvegarde.
6. Inspecter les deux thèmes, les langues et le mobile, puis lancer les contrôles ci-dessous.

Autodocs est activé globalement pour les stories de composants. Les fondations le désactivent et servent de guides visuels. Les métadonnées du framework peuvent découvrir les Inputs/Outputs ; les `argTypes` explicites décrivent les propriétés de template supplémentaires et événements. Conserver les descriptions publiques près de l’API de production ou dans les paramètres de story.

## Compiler, vérifier et partager

```powershell
npm run storybook:typecheck
npm run storybook:build
npm exec playwright install chromium
npm run test:storybook
npm test
npm run build
npm run format:check
```

La compilation produit `storybook-static/`, ignoré par Git. Servir le dossier entier sur HTTP/HTTPS, avec `index.json`, `iframe.html` et `assets/` ; ne pas l’ouvrir avec `file://`. Aucun workflow de publication Storybook n’est ajouté : le workflow Pages existant publie toujours uniquement le site documentaire. Télémétrie et rapports d’erreur Storybook sont désactivés.

Le contrôle navigateur ouvre toutes les stories de l’index statique, attend leur succès Storybook (assertions play comprises), visite autodocs et vérifie traduction, palette, sombre, WebGL, JSON mobile et isolation du stockage. Les captures d’inspection sont écrites dans le dossier ignoré `.cache/storybook-review/`. Il utilise des processus Chromium isolés avec composition logicielle et WebGL SwiftShader pour éviter les problèmes du pilote GPU hôte ; ce ne sont pas des tests sur appareil physique ni WebView2 natif. Comme pour les autres scripts, définir `PLAYWRIGHT_BROWSERS_PATH` de façon cohérente si le runtime est installé dans un cache personnalisé.
