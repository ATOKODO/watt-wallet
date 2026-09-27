# Vérification de la V1

Validation locale terminée le 27 septembre 2026 sous Windows x64, avec Node 24.20, Angular 22.1.7, Three.js 0.186 et Tauri 2.

| Vérification                         | Résultat                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| Compilation Angular production       | Réussie, `dist/watt-wallet/browser`                                           |
| Tests unitaires Vitest               | 41 réussis                                                                    |
| Parcours Playwright Chromium         | 8 réussis, 49,1 secondes                                                      |
| SPA production hors connexion        | Rechargement, IndexedDB et scène 3D vérifiés ; aucune requête externe         |
| Test Rust de remplacement atomique   | Réussi                                                                        |
| Formatage Prettier                   | Conforme                                                                      |
| Compilation Windows et paquet NSIS   | Réussis                                                                       |
| Installation NSIS temporaire         | Réussie, sans raccourcis                                                      |
| Intégrité du binaire installé        | SHA-256 vérifié après normalisation du seul marqueur NSIS réservé par Tauri   |
| Application installée, WebView2 réel | Mode sombre, scène 3D, orbite, grille, JSON, scénarios et sauvegarde vérifiés |
| Redémarrage natif                    | Données sauvegardées relues correctement                                      |
| Désinstallation de test              | Réussie ; binaire et entrée de désinstallation Windows supprimés              |

Les huit parcours navigateur couvrent le glisser-déposer, le déplacement direct et l’orbite autour du plateau ; les fiches, quantités, HP/HC, scénarios et import dans un profil vierge ; le mode sans WebGL à 390 pixels de large ; un GLB personnalisé partagé avec le logement et ses copies.

Le nouveau parcours vérifie aussi le mode sombre selon la préférence système, son activation manuelle et sa persistance après rechargement, avec captures sur ordinateur et mobile.

Deux problèmes propres au runtime Windows ont été corrigés avant livraison : le chargement du CSS sous CSP stricte et l’interception native du glisser-déposer. Le test natif vérifie désormais explicitement ces deux comportements, en plus des données.

## Artefacts

- Installateur : `src-tauri/target/release/bundle/nsis/Watt Wallet_0.1.0_x64-setup.exe`, 2 467 634 octets.
- SHA-256 de l’installateur : `7C393BA78FC8B036BC654CD7F02D136360A24498D0D9AEA32169F4B3B7CAE089`.
- SHA-256 du binaire installé : `e536f366d7078424ca1cce8d5c429c19a00aae48c75b3248b1e955697c050740`.
- Captures : `test-results/watt-wallet-desktop.png`, `test-results/watt-wallet-mobile-fallback.png`, `test-results/watt-wallet-native.png`, `test-results/watt-wallet-dark.png`, `test-results/watt-wallet-dark-json-mobile.png`.
- Format documenté : `docs/wattpack.md`, schéma `docs/wattpack.schema.json`, exemples dans `examples/`.

L’installateur n’est pas signé. WebView2 était déjà présent sur la machine de test : le chemin de téléchargement du runtime sur une machine vierge n’a pas été testé. Les sélecteurs natifs de fichiers utilisent les plugins officiels Tauri ; leur manipulation interactive n’est pas automatisée dans le test natif. Les parcours d’import/export et les ressources personnalisées sont vérifiés dans Chromium.
