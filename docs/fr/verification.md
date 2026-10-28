[English](../en/verification.md) · [Français](../fr/verification.md) · [Accueil](../../README.fr.md)

# Vérifications et limites connues

Cette page décrit les suites de tests et les limites de l’application. Le [guide développeur](development.md#tests-et-contrôles) détaille leur installation et leurs commandes. Utiliser le [guide des tests manuels](human-testing.md) pour vérifier les parcours complets et signaler un problème.

## Couverture des tests automatisés

| Suite                                 | Couverture                                                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests unitaires (`tests/`)            | Formules énergétiques, veille, quantités, tarifs, comparaisons, puissance simulée, validation, import/export, erreurs de stockage, grille, traductions et couleurs de la palette.                       |
| Parcours navigateur (`e2e/`)          | Fiches et JSON, appareils, scénarios, commandes 3D, disposition mobile, repli sans WebGL, persistance, onglets concurrents, reprise après erreur de stockage, échanges GLB, langue, devise et licences. |
| Contrôle de production hors connexion | Cache complet du service worker, rechargement hors connexion, données locales, polices, 3D et notices de licences. L’option `--slow-prefetch` exerce le cas d’un cache incomplet avant déconnexion.     |
| Tests Rust et Windows installé        | Sauvegardes atomiques, refus des écritures périmées, comportement WebView2, persistance après redémarrage, installation et désinstallation isolées.                                                     |
| Storybook                             | Interactions des composants, thèmes, traductions, états de l’éditeur, 3D, isolation du stockage et cibles Figma intégrées à l’aide de réponses réseau locales.                                          |
| Régression visuelle                   | Captures de l’application et de Storybook aux dimensions, langues et thèmes configurés. Consulter le [guide de régression visuelle](visual-testing.md).                                                 |
| Documentation                         | Liens internes, ancres, ressources, navigation, changement de langue, recherche et exemples téléchargeables.                                                                                            |

Les parcours navigateur et comparaisons visuelles utilisent Chromium. Leurs dimensions décrivent des dispositions, pas des appareils physiques. Tester Safari, les autres moteurs de navigateur et les interactions tactiles sur les appareils ciblés pour vérifier leur compatibilité.

La sélection et l’annulation dans les fenêtres natives de fichiers, l’installation de WebView2 sur une machine dépourvue du runtime et l’utilisation au clavier ou au lecteur d’écran nécessitent des vérifications manuelles. Le panneau d’accessibilité Storybook aide à repérer les problèmes ; il ne remplace pas une revue d’accessibilité de l’application complète.

## Plateformes et prérequis d’installation

- L’application navigateur nécessite localhost ou HTTPS pour son service worker. La réouverture hors connexion demande un premier chargement complet sur la même origine.
- WebGL est nécessaire à la scène 3D. La liste des appareils et les formulaires restent disponibles sans lui.
- La version de bureau cible Windows x64 et nécessite WebView2. L’installateur NSIS non signé télécharge le runtime si nécessaire, ce qui demande une connexion Internet.
- Aucun installateur macOS ou Linux n’est fourni.

## Données locales et récupération

Les logements et fiches sont stockés sur l’appareil courant. Il n’y a ni synchronisation cloud, ni sauvegarde externe automatique, ni historique d’annulation. Exporter séparément les logements et la bibliothèque pour conserver des sauvegardes portables.

Chaque profil de navigateur, origine web et installation de bureau dispose de son propre stockage. Effacer les données du navigateur supprime son espace de travail local. En cas d’échec de sauvegarde ou de changement depuis une autre fenêtre, exporter les modifications locales à conserver avant de recharger.

Retirer ou remplacer un visuel personnalisé peut laisser des ressources GLB inutilisées dans le stockage local ; aucune commande de compactage n’est disponible. L’export d’un logement contient ses modèles référencés et ses scénarios, mais pas les autres logements, les fiches inutilisées de la bibliothèque ou les préférences d’interface.

Consulter [l’enregistrement et la récupération](user-guide.md#enregistrement-et-récupération) pour les actions disponibles.

## Estimations et périmètre de la V1

Les fiches fournies sont des exemples modifiables. Les estimations dépendent des équipements, usages et prix renseignés par l’utilisateur. Le chauffage utilise une durée équivalente explicite de fonctionnement, sans modèle thermique, météorologique ou d’isolation.

La puissance simulée n’est ni une mesure en direct ni une prévision de la capacité de l’installation. Elle ne modifie pas les estimations annuelles d’énergie. Le choix EUR/USD modifie l’affichage sans convertir les montants saisis.

La V1 n’inclut ni catalogue en ligne, comptes, intégration Linky, données de compteur en direct, reconnaissance photo, éditeur de géométrie ou tarifs calendaires comme Tempo. Consulter les [règles de calcul](calculations.md) et les [limites du format d’échange](wattpack.md).
