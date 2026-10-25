[English](../en/verification.md) · [Français](../fr/verification.md) · [Accueil](../../README.fr.md)

# Vérifications et limites connues

Validation locale terminée le 1er octobre 2026 sous Windows x64, avec Node 24.20, Angular 22.1.7, Three.js 0.186 et Tauri 2.

Ce rapport conserve les résultats historiques de cette validation. La mise à jour de la documentation ne constitue pas une nouvelle exécution des tests ni une validation d’un autre binaire.

## Identité Walletricity — 25 octobre 2026

Le nom public devient **Walletricity** dans le mot-logo, les libellés accessibles, les titres, le manifeste PWA, l’installateur et l’exécutable Windows, Storybook, la documentation et les écrans Figma. Le symbole éclair et les palettes sont conservés. `watt-wallet` reste un identifiant technique de projet/stockage/format. Les noms et empreintes des anciens binaires ci-dessous décrivent toujours leurs artefacts d’origine.

Vérifications de ce changement : 84 tests unitaires réussis ; nouveau parcours Chromium de marque réussi en français/anglais, avec vérification de l’espace IndexedDB existant et d’un export `.wattpack` compatible. Les références visuelles ont été actualisées volontairement (46 PNG modifiés sur 138), puis la comparaison a réussi avec **86 tests réussis et 17 exclusions prévues**. Les 147 captures documentaires ont été régénérées ; celles sans marque visible restent identiques.

Les 84 écrans principaux de présentation Figma utilisent les mots-logos partagés actualisés, sans ancien nom public dans leur texte. Les mots-logos desktop et mobile ont été contrôlés sur une seule ligne. Le nouvel installateur Windows a passé l’installation isolée, les vérifications WebView2 de l’application installée, le redémarrage et la désinstallation. Le déploiement Netlify et la CI hébergée n’ont pas été exercés pour ce changement de marque.

- Installateur : `src-tauri/target/release/bundle/nsis/Walletricity_0.1.0_x64-setup.exe`, **2 808 362 octets**.
- SHA-256 de l’installateur : `7DA6FAC3B9BF3DC289FE7E33DF298922297A57E9A759F8BBB1FD13DC55237D20`.
- SHA-256 normalisé du binaire installé : `7c0147ad80a99f048ce563656fec70ae6d5215840cdf0b2e811b55f2786763d8`.

## Revue avant les essais humains — 7 octobre 2026 {#revue-avant-les-essais-humains-7-octobre-2026}

La version actuelle peut servir à une première session d’essais humains : aucun échec bloquant n’a été trouvé dans les vérifications locales suivantes. Il s’agit d’une revue Windows/Chromium locale, pas d’une certification de toutes les plateformes ni du runner CI hébergé. Suivre le [parcours d’essais humains](human-testing.md) pour les vérifications manuelles restantes.

| Vérification                      | Résultat local actuel                                                                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests unitaires                   | 84 réussis dans 8 fichiers.                                                                                                                                                                                                                                                                       |
| Parcours Chromium de bout en bout | 27 réussis, dont retrait en scénario, disposition mobile, conflits de sauvegarde, échange GLB et choix EUR/USD persistant.                                                                                                                                                                        |
| Tests Rust de sauvegarde          | 3 réussis ; formatage Rust conforme.                                                                                                                                                                                                                                                              |
| Régression visuelle               | 86 réussis, 17 volontairement ignorés selon le viewport ; les 138 références PNG suivies restent inchangées. Le WebGL réel est comparé dans les cas 3D.                                                                                                                                           |
| Storybook                         | Vérification des types et 29 vérifications des stories réussies.                                                                                                                                                                                                                                  |
| Compilation web et hors connexion | Production compilée ; application en anglais, IndexedDB et vraie scène 3D relus depuis le cache sans requête externe.                                                                                                                                                                             |
| Livraison Windows                 | Nouvelle compilation NSIS, installation isolée, vérification WebView2 de l’application installée, redémarrage et désinstallation réussis. La persistance de la devise après redémarrage est maintenant testée explicitement, sans changer les montants numériques enregistrés ni les kWh annuels. |
| Site documentaire                 | 39 pages HTML et 1 606 liens, ressources et ancres locales vérifiés ; navigation dans le navigateur validée à `/` et sous le chemin GitHub Pages `/watt-wallet/`.                                                                                                                                 |
| Exemples d’échange                | Les trois paquets d’exemple sont validés, importés et conservés après export/réouverture ; octets GLB d’origine préservés. Six exemples JSON de documentation validés et schéma public conforme à la validation d’exécution.                                                                      |

La documentation contient **147 PNG de présentation** répartis en sept séries et quatre tailles de viewport. Ils ont été comparés à de nouvelles captures de l’interface actuelle ; 24 images d’en-tête/fond de fenêtre ont été actualisées pour le bouton de devise. Les empreintes des ressources de production restent `main-BSCQTZQP.js` et `styles-J6DM3ODP.css`. Les galeries sont distinctes des références de régression visuelle. Voir le [guide de régression visuelle](visual-testing.md) et l’[index des captures](../screenshots/README.md).

Figma a été vérifié par rapport au code et aux correspondances Storybook. Les **84 écrans de présentation** héritent maintenant du contrôle de devise grâce à 24 en-têtes partagés mis à jour. Le design system contient 25 ensembles de composants, 129 variantes et 42 composants d’icônes. Les 29 références Storybook pointent vers des nœuds existants. Les stories de plateau vide ou à consommation nulle renvoient volontairement à une référence de design peuplée et annotée ; elles restent des cas exécutables dans le code, sans écran Figma distinct identique. L’authentification Figma intégrée dans Brave dépend encore des permissions du navigateur et n’est pas couverte par ces vérifications.

Artefacts compilés actuels, remplaçant la livraison historique ci-dessous :

- Installateur : `src-tauri/target/release/bundle/nsis/Watt Wallet_0.1.0_x64-setup.exe`, **2 806 521 octets**.
- SHA-256 de l’installateur : `FB6479FD9B1BFBE6D9C222215C56C838479586064A6F8CB685C54357BB05530E`.
- SHA-256 normalisé du binaire installé : `de728f599b29bb77f6043ce83ffebc55bde4679c845424650726fb805c119154`.

Restent à vérifier avec des personnes : sélecteurs natifs d’import/export et annulation, appareils mobiles physiques et Safari, compréhension des parcours et confort au clavier. L’installateur reste non signé ; le téléchargement du bootstrapper sur une machine sans WebView2 n’a pas été exercé. Les contrôles d’accessibilité Storybook sont indicatifs, pas un audit WCAG. Les résultats locaux ne prouvent pas une exécution GitHub Actions réussie. Les résultats et empreintes du 1er octobre ci-dessous sont conservés comme historique.

## Résultats enregistrés

| Vérification                            | Résultat                                                                                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compilation Angular production          | Réussie, `dist/watt-wallet/browser`                                                                                                                                           |
| Tests unitaires Vitest                  | 83 réussis                                                                                                                                                                    |
| Parcours Playwright Chromium            | 23 parcours vérifiés : 22 en revue complète, puis 4 ciblés GLB dont 1 nouveau                                                                                                 |
| SPA production hors connexion           | Rechargement en anglais, IndexedDB et scène 3D vérifiés ; aucune requête externe                                                                                              |
| Tests Rust de sauvegarde et concurrence | 3 réussis                                                                                                                                                                     |
| Formatage Prettier                      | Conforme                                                                                                                                                                      |
| Compilation Windows et paquet NSIS      | Réussis                                                                                                                                                                       |
| Installation NSIS temporaire            | Réussie, sans raccourcis                                                                                                                                                      |
| Intégrité du binaire installé           | SHA-256 vérifié après normalisation du seul marqueur NSIS réservé par Tauri                                                                                                   |
| Application installée, WebView2 réel    | Français/anglais persistants, mode sombre, palette persistante, scène 3D, plateau adaptatif, orbite, grille, JSON, scénarios, puissance simulée et repère de facture vérifiés |
| Redémarrage natif                       | Données sauvegardées relues ; langue, palette et repère de facture conservés, états de simulation remis à zéro                                                                |
| Désinstallation de test                 | Réussie ; binaire et entrée de désinstallation Windows supprimés                                                                                                              |

## Couverture et régressions

Les vingt-trois parcours navigateur couvrent le glisser-déposer, le déplacement direct et l’orbite ; les fiches, quantités, HP/HC, scénarios et import dans un profil vierge ; le mode sans WebGL et les écrans étroits ; un GLB personnalisé partagé avec le logement et ses copies. Le parcours de puissance simulée vérifie que les watts changent sans modifier les kWh annuels, que les scénarios ont des états temporaires distincts et que le repère de facture survit au rechargement et à l’échange `.wattpack`.

Les 22 parcours Chromium existants ont passé une exécution complète lors de la dernière revue. Après la correction du budget GLB, les quatre parcours concernés ont été exécutés à nouveau, dont un nouveau parcours de rejet avant stockage et de traduction de l’erreur. Les assertions autorisent 15 secondes avec le rendu WebGL logiciel. Le parcours de langue attend la fin de l’application des modifications avant de saisir un nouveau brouillon ; le GLB plat de démonstration est vérifié en mode Placement pour rester dans le cadrage.

Le parcours de palette vérifie les couleurs proposées et personnalisées, la persistance avec les modes clair/sombre, le contraste des boutons avec des couleurs vives et l’éditeur sur mobile. WebView2 vérifie le changement réel des surfaces et la palette après redémarrage.

Le plateau adaptatif est vérifié avec 120 appareils : rangement sans chevauchement, positions dépassant les anciennes limites, export/import et rechargement, cadrage sur ordinateur et mobile. Les tests unitaires couvrent aussi 500 objets allongés et la limitation des repères de grille. WebView2 vérifie le plateau agrandi, la sauvegarde des positions et le redémarrage dans un profil temporaire isolé.

Les parcours de langue vérifient les libellés français/anglais, les attributs accessibles, les formats numériques, les formulaires et erreurs JSON, le tarif HP/HC et les scénarios, la recherche et les filtres, la conservation des noms et notes personnels et des saisies en cours, la persistance au rechargement, le choix au clavier et la disposition mobile. Un contrôle du catalogue couvre tous les textes statiques des templates et les silhouettes intégrées. La version de production reste en anglais après rechargement hors connexion. Le test natif vérifie également le choix de langue après redémarrage.

Les régressions de la revue sont couvertes : un brouillon d’usage reste intact pendant le rangement, ses positions actualisées survivent à l’application et au rechargement, deux onglets refusent un écrasement concurrent et permettent une récupération explicite, une fiche refusée conserve son formulaire et n’affiche aucune réussite, un import refusé n’écrit aucun GLB, et l’accrochage évite les empreintes hors grille. Les libellés accessibles du catalogue anglais sont également vérifiés.

Les tests unitaires couvrent les mutations refusées, la sérialisation des sauvegardes, les erreurs de stockage et le blocage des écritures après conflit. Ils vérifient aussi le partage d’un manifeste de plus de 2 Mio, le nom de logement à la limite de 100 caractères et le maintien des limites de 100 Mio et 200 entrées. Les trois tests Rust vérifient le remplacement atomique, le refus d’une copie périmée et le verrou partagé entre écrivains concurrents. Le test WebView2 de l’application installée reproduit un conflit par IPC, vérifie que la sauvegarde reste intacte et confirme la conservation d’un brouillon lors du rangement.

Les reprises après erreur de stockage sont vérifiées avec deux échecs successifs : logements et scénarios conservent leur identifiant, le nom corrigé et leurs modifications locales. Les imports de logement avec scénario et de bibliothèque réutilisent les mêmes identifiants et le GLB original, y compris après un échec d’écriture de ressource. Une nouvelle demande après fermeture crée bien une copie distincte. Les données et les ressources sont contrôlées après rechargement. Le test de l’application Windows installée rend temporairement le fichier de sauvegarde en lecture seule pour provoquer deux erreurs réelles de remplacement atomique, puis vérifie une reprise sans doublons et le rechargement.

Le chargement GLB contrôle désormais un budget conservateur de 64 Mio avant Three.js. Les tests refusent les fichiers de moins de 1 Kio qui déclarent plus de 100 Mo d’attributs décodés ; un espion vérifie que le parseur Three.js n’est jamais appelé. Ils couvrent les accessors sparse ou sans buffer, les vues binaires partagées, la limite exacte et les matrices. Les buffers interleaved ordinaires et les petits modèles sparse restent acceptés. Le parcours navigateur vérifie le rejet dans une fiche et un paquet, l’absence d’écriture locale, la conservation du formulaire et le message anglais.

Deux problèmes propres au runtime Windows ont été corrigés avant livraison : le chargement du CSS sous CSP stricte et l’interception native du glisser-déposer. Le test natif vérifie explicitement ces comportements.

## Artefacts

- Installateur : `src-tauri/target/release/bundle/nsis/Watt Wallet_0.1.0_x64-setup.exe`, 2 477 381 octets.
- SHA-256 de l’installateur : `1AB4F9B593E58BD7848806EAA6AB86FF7930F4C7A70208A43EDD72575B67E33E`.
- SHA-256 normalisé du binaire installé : `1dafa1e793fad21b8fdb1c04001e7c0be4068f7e6604aadad4327494a9ed53ac`.
- Captures : `test-results/watt-wallet-desktop.png`, `test-results/watt-wallet-mobile-fallback.png`, `test-results/watt-wallet-native.png`, `test-results/watt-wallet-dark.png`, `test-results/watt-wallet-dark-json-mobile.png`, `test-results/watt-wallet-power.png` et `test-results/watt-wallet-power-mobile.png`, ainsi que `test-results/watt-wallet-palette-light.png`, `test-results/watt-wallet-palette-dark.png` et `test-results/watt-wallet-palette-mobile.png`, `test-results/watt-wallet-adaptive-board.png` et `test-results/watt-wallet-adaptive-board-mobile.png`, `test-results/watt-wallet-english-dark.png`, `test-results/watt-wallet-language-mobile.png` et `test-results/watt-wallet-native-english.png`.
- Format documenté : `docs/wattpack.md`, schéma `docs/wattpack.schema.json`, exemples dans `examples/`.

## Limites de validation

L’installateur n’est pas signé. WebView2 était déjà présent sur la machine de test : le chemin de téléchargement du runtime sur une machine vierge n’a pas été testé. Les sélecteurs natifs de fichiers utilisent les plugins officiels Tauri ; leur manipulation interactive n’est pas automatisée dans le test natif. Les parcours d’import/export et les ressources personnalisées sont vérifiés dans Chromium.

Les captures de présentation dans [l’index des captures](../screenshots/README.md) utilisent Chromium avec des viewports iPhone, iPad, MacBook et desktop. Elles montrent les dispositions responsives, sans test sur appareils Apple physiques ni validation Safari. Les artefacts de compilation et les captures de test listés ci-dessus sont des fichiers générés, non garantis dans un clone vierge.

## Limites fonctionnelles de la V1

Pas de catalogue en ligne, comptes, synchronisation cloud, Linky, mesures en direct, reconnaissance photo, éditeur de géométrie, simulation thermique ou tarifs calendaires comme Tempo. Les fiches initiales sont génériques et les tarifs saisis manuellement. Le simulateur de puissance ne mesure pas les pointes ni la capacité de l’installation. Les GLB retirés peuvent rester dans le stockage local, sans commande de compactage.

Voir le [guide utilisateur](user-guide.md) pour les sauvegardes et le dépannage, les [calculs](calculations.md) pour les hypothèses et le [guide développeur](development.md) pour reproduire les contrôles.
