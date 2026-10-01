# Vérification de la V1

Validation locale terminée le 1er octobre 2026 sous Windows x64, avec Node 24.20, Angular 22.1.7, Three.js 0.186 et Tauri 2.

| Vérification                            | Résultat                                                                                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compilation Angular production          | Réussie, `dist/watt-wallet/browser`                                                                                                                                           |
| Tests unitaires Vitest                  | 69 réussis                                                                                                                                                                    |
| Parcours Playwright Chromium            | 22 réussis                                                                                                                                                                    |
| SPA production hors connexion           | Rechargement en anglais, IndexedDB et scène 3D vérifiés ; aucune requête externe                                                                                              |
| Tests Rust de sauvegarde et concurrence | 3 réussis                                                                                                                                                                     |
| Formatage Prettier                      | Conforme                                                                                                                                                                      |
| Compilation Windows et paquet NSIS      | Réussis                                                                                                                                                                       |
| Installation NSIS temporaire            | Réussie, sans raccourcis                                                                                                                                                      |
| Intégrité du binaire installé           | SHA-256 vérifié après normalisation du seul marqueur NSIS réservé par Tauri                                                                                                   |
| Application installée, WebView2 réel    | Français/anglais persistants, mode sombre, palette persistante, scène 3D, plateau adaptatif, orbite, grille, JSON, scénarios, puissance simulée et repère de facture vérifiés |
| Redémarrage natif                       | Données sauvegardées relues ; langue, palette et repère de facture conservés, états de simulation remis à zéro                                                                |
| Désinstallation de test                 | Réussie ; binaire et entrée de désinstallation Windows supprimés                                                                                                              |

Les vingt-deux parcours navigateur couvrent le glisser-déposer, le déplacement direct et l’orbite ; les fiches, quantités, HP/HC, scénarios et import dans un profil vierge ; le mode sans WebGL et les écrans étroits ; un GLB personnalisé partagé avec le logement et ses copies. Le parcours de puissance simulée vérifie que les watts changent sans modifier les kWh annuels, que les scénarios ont des états temporaires distincts et que le repère de facture survit au rechargement et à l’échange `.wattpack`.

Les 22 parcours Chromium ont été vérifiés par une exécution complète suivie de reprises ciblées des assertions de rendu. Les assertions autorisent 15 secondes avec le rendu WebGL logiciel. Le parcours de langue attend la fin de l’application des modifications avant de saisir un nouveau brouillon ; le GLB plat de démonstration est vérifié en mode Placement pour rester dans le cadrage.

Le parcours de palette vérifie les couleurs proposées et personnalisées, la persistance avec les modes clair/sombre, le contraste des boutons avec des couleurs vives et l’éditeur sur mobile. WebView2 vérifie le changement réel des surfaces et la palette après redémarrage.

Le plateau adaptatif est vérifié avec 120 appareils : rangement sans chevauchement, positions dépassant les anciennes limites, export/import et rechargement, cadrage sur ordinateur et mobile. Les tests unitaires couvrent aussi 500 objets allongés et la limitation des repères de grille. WebView2 vérifie le plateau agrandi, la sauvegarde des positions et le redémarrage dans un profil temporaire isolé.

Les parcours de langue vérifient les libellés français/anglais, les attributs accessibles, les formats numériques, les formulaires et erreurs JSON, le tarif HP/HC et les scénarios, la recherche et les filtres, la conservation des noms et notes personnels et des saisies en cours, la persistance au rechargement, le choix au clavier et la disposition mobile. Un contrôle du catalogue couvre tous les textes statiques des templates et les silhouettes intégrées. La version de production reste en anglais après rechargement hors connexion. Le test natif vérifie également le choix de langue après redémarrage.

Les régressions de la revue sont couvertes : un brouillon d’usage reste intact pendant le rangement, ses positions actualisées survivent à l’application et au rechargement, deux onglets refusent un écrasement concurrent et permettent une récupération explicite, une fiche refusée conserve son formulaire et n’affiche aucune réussite, un import refusé n’écrit aucun GLB, et l’accrochage évite les empreintes hors grille. Les libellés accessibles du catalogue anglais sont également vérifiés.

Les tests unitaires couvrent les mutations refusées, la sérialisation des sauvegardes, les erreurs de stockage et le blocage des écritures après conflit. Ils vérifient aussi le partage d’un manifeste de plus de 2 Mio, le nom de logement à la limite de 100 caractères et le maintien des limites de 100 Mio et 200 entrées. Les trois tests Rust vérifient le remplacement atomique, le refus d’une copie périmée et le verrou partagé entre écrivains concurrents. Le test WebView2 de l’application installée reproduit un conflit par IPC, vérifie que la sauvegarde reste intacte et confirme la conservation d’un brouillon lors du rangement.

Les reprises après erreur de stockage sont vérifiées avec deux échecs successifs : logements et scénarios conservent leur identifiant, le nom corrigé et leurs modifications locales. Les imports de logement avec scénario et de bibliothèque réutilisent les mêmes identifiants et le GLB original, y compris après un échec d’écriture de ressource. Une nouvelle demande après fermeture crée bien une copie distincte. Les données et les ressources sont contrôlées après rechargement. Le test de l’application Windows installée rend temporairement le fichier de sauvegarde en lecture seule pour provoquer deux erreurs réelles de remplacement atomique, puis vérifie une reprise sans doublons et le rechargement.

Deux problèmes propres au runtime Windows ont été corrigés avant livraison : le chargement du CSS sous CSP stricte et l’interception native du glisser-déposer. Le test natif vérifie explicitement ces comportements.

## Artefacts

- Installateur : `src-tauri/target/release/bundle/nsis/Watt Wallet_0.1.0_x64-setup.exe`, 2 475 520 octets.
- SHA-256 de l’installateur : `B85C7C523068BF0C49850DD9CFA55EFC68FEFC2E2679A3D301D108D6CDF76178`.
- SHA-256 normalisé du binaire installé : `5afe2210e8bf386fdec04d7da51cbf85d1e0d89024a9dea4ba22a983565e7d45`.
- Captures : `test-results/watt-wallet-desktop.png`, `test-results/watt-wallet-mobile-fallback.png`, `test-results/watt-wallet-native.png`, `test-results/watt-wallet-dark.png`, `test-results/watt-wallet-dark-json-mobile.png`, `test-results/watt-wallet-power.png` et `test-results/watt-wallet-power-mobile.png`, ainsi que `test-results/watt-wallet-palette-light.png`, `test-results/watt-wallet-palette-dark.png` et `test-results/watt-wallet-palette-mobile.png`, `test-results/watt-wallet-adaptive-board.png` et `test-results/watt-wallet-adaptive-board-mobile.png`, `test-results/watt-wallet-english-dark.png`, `test-results/watt-wallet-language-mobile.png` et `test-results/watt-wallet-native-english.png`.
- Format documenté : `docs/wattpack.md`, schéma `docs/wattpack.schema.json`, exemples dans `examples/`.

L’installateur n’est pas signé. WebView2 était déjà présent sur la machine de test : le chemin de téléchargement du runtime sur une machine vierge n’a pas été testé. Les sélecteurs natifs de fichiers utilisent les plugins officiels Tauri ; leur manipulation interactive n’est pas automatisée dans le test natif. Les parcours d’import/export et les ressources personnalisées sont vérifiés dans Chromium.
