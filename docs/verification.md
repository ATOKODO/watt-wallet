# Vérification de la V1

Validation locale terminée le 30 septembre 2026 sous Windows x64, avec Node 24.20, Angular 22.1.7, Three.js 0.186 et Tauri 2.

| Vérification                         | Résultat                                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Compilation Angular production       | Réussie, `dist/watt-wallet/browser`                                                                                          |
| Tests unitaires Vitest               | 49 réussis                                                                                                                   |
| Parcours Playwright Chromium         | 10 réussis                                                                                                                   |
| SPA production hors connexion        | Rechargement, IndexedDB et scène 3D vérifiés ; aucune requête externe                                                        |
| Test Rust de remplacement atomique   | Réussi                                                                                                                       |
| Formatage Prettier                   | Conforme                                                                                                                     |
| Compilation Windows et paquet NSIS   | Réussis                                                                                                                      |
| Installation NSIS temporaire         | Réussie, sans raccourcis                                                                                                     |
| Intégrité du binaire installé        | SHA-256 vérifié après normalisation du seul marqueur NSIS réservé par Tauri                                                  |
| Application installée, WebView2 réel | Mode sombre, palette persistante, scène 3D, orbite, grille, JSON, scénarios, puissance simulée et repère de facture vérifiés |
| Redémarrage natif                    | Données sauvegardées relues ; palette et repère de facture conservés, états de simulation remis à zéro                       |
| Désinstallation de test              | Réussie ; binaire et entrée de désinstallation Windows supprimés                                                             |

Les dix parcours navigateur couvrent le glisser-déposer, le déplacement direct et l’orbite ; les fiches, quantités, HP/HC, scénarios et import dans un profil vierge ; le mode sans WebGL et les écrans étroits ; un GLB personnalisé partagé avec le logement et ses copies. Le parcours de puissance simulée vérifie que les watts changent sans modifier les kWh annuels, que les scénarios ont des états temporaires distincts et que le repère de facture survit au rechargement et à l’échange `.wattpack`.

Le parcours de palette vérifie les couleurs proposées et personnalisées, la persistance avec les modes clair/sombre, le contraste des boutons avec des couleurs vives et l’éditeur sur mobile. WebView2 vérifie le changement réel des surfaces et la palette après redémarrage.

Deux problèmes propres au runtime Windows ont été corrigés avant livraison : le chargement du CSS sous CSP stricte et l’interception native du glisser-déposer. Le test natif vérifie explicitement ces comportements.

## Artefacts

- Installateur : `src-tauri/target/release/bundle/nsis/Watt Wallet_0.1.0_x64-setup.exe`, 2 470 018 octets.
- SHA-256 de l’installateur : `409B9864B2B9CD719706F2529258539E03F0224D3A3D0C01BC753637466722BC`.
- SHA-256 normalisé du binaire installé : `b96ebdd0a85b5c30d76d37aab1f5e22d64d96a06d24d607f9be48e4a77618a09`.
- Captures : `test-results/watt-wallet-desktop.png`, `test-results/watt-wallet-mobile-fallback.png`, `test-results/watt-wallet-native.png`, `test-results/watt-wallet-dark.png`, `test-results/watt-wallet-dark-json-mobile.png`, `test-results/watt-wallet-power.png` et `test-results/watt-wallet-power-mobile.png`, ainsi que `test-results/watt-wallet-palette-light.png`, `test-results/watt-wallet-palette-dark.png` et `test-results/watt-wallet-palette-mobile.png`.
- Format documenté : `docs/wattpack.md`, schéma `docs/wattpack.schema.json`, exemples dans `examples/`.

L’installateur n’est pas signé. WebView2 était déjà présent sur la machine de test : le chemin de téléchargement du runtime sur une machine vierge n’a pas été testé. Les sélecteurs natifs de fichiers utilisent les plugins officiels Tauri ; leur manipulation interactive n’est pas automatisée dans le test natif. Les parcours d’import/export et les ressources personnalisées sont vérifiés dans Chromium.
