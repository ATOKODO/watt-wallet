# Captures Walletricity — iPhone 16 Pro

21 captures PNG de **402 × 874 pixels**, en français. Captures du viewport, sans cadre d’appareil ni assemblage de page entière.

Rendu Chromium à l’échelle 1, avec des données de démonstration isolées. Ces captures montrent les dispositions responsives, sans validation Safari ou appareil Apple natif.

[Ouvrir la galerie](index.html)

| Fichier                                                        | Fonctionnalité                                                  |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| [01-accueil-clair.png](01-accueil-clair.png)                   | Accueil mobile, bibliothèque rapide et navigation               |
| [02-estimation-annuelle.png](02-estimation-annuelle.png)       | Consommation annuelle, budget et moyenne mensuelle              |
| [03-plateau-consommation.png](03-plateau-consommation.png)     | Diorama 3D et parts de consommation                             |
| [04-placement-grille.png](04-placement-grille.png)             | Placement uniforme, rangement en grille et accrochage           |
| [05-repartition-categories.png](05-repartition-categories.png) | Répartition annuelle par catégorie et repère de facture         |
| [06-bibliotheque.png](06-bibliotheque.png)                     | Bibliothèque de fiches génériques et personnalisables           |
| [07-fiche-formulaire.png](07-fiche-formulaire.png)             | Création manuelle d’une fiche d’appareil                        |
| [08-fiche-json.png](08-fiche-json.png)                         | Éditeur JSON synchronisé et statut de validation                |
| [09-fiche-json-apercu.png](09-fiche-json-apercu.png)           | Prévisualisation des données et estimation annuelle de la fiche |
| [10-usages-appareil.png](10-usages-appareil.png)               | Paramètres de l’appareil et quantité                            |
| [10b-puissance-et-duree.png](10b-puissance-et-duree.png)       | Puissance moyenne, heures, jours et placement de l’appareil     |
| [11-detail-calcul.png](11-detail-calcul.png)                   | Explication du calcul et séparation fonctionnement/veille       |
| [12-puissance-simulee.png](12-puissance-simulee.png)           | Total des appareils en marche, en veille ou arrêtés             |
| [13-comparaison-scenario.png](13-comparaison-scenario.png)     | Scénario indépendant, économies et retour sur le surcoût        |
| [14-tarif-heures-creuses.png](14-tarif-heures-creuses.png)     | Tarif heures pleines/heures creuses et abonnement séparé        |
| [15-repere-facture.png](15-repere-facture.png)                 | Comparaison facultative avec les kWh de douze mois de factures  |
| [16-import-wattpack.png](16-import-wattpack.png)               | Aperçu avant import d’un logement et de ses scénarios           |
| [17-palette-theme.png](17-palette-theme.png)                   | Palette et couleur personnalisée appliquées à l’interface       |
| [18-accueil-sombre.png](18-accueil-sombre.png)                 | Estimation annuelle en thème sombre lavande                     |
| [19-plateau-sombre.png](19-plateau-sombre.png)                 | Plateau 3D en thème sombre lavande                              |
| [20-interface-anglaise.png](20-interface-anglaise.png)         | Interface anglaise et formats numériques localisés              |

## Régénérer

```powershell
npm start
# In another terminal / Dans un autre terminal :
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/playwright'
node scripts/screenshots-mobile.mjs
```
