# Watt Wallet screenshots — MacBook Pro 14 pouces

21 PNG screenshots at **1512 × 982 pixels**, in English. Viewport captures without a device frame or full-page stitching.

Chromium at scale 1 with isolated demo data. These are responsive layout captures, not Safari or native Apple device validation.

[Open the gallery](index.html)

| File                                                           | Feature                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| [01-accueil-clair.png](01-accueil-clair.png)                   | Home, quick device library and navigation                    |
| [02-estimation-annuelle.png](02-estimation-annuelle.png)       | Annual consumption, electricity budget and monthly average   |
| [03-plateau-consommation.png](03-plateau-consommation.png)     | 3D diorama and consumption shares                            |
| [04-placement-grille.png](04-placement-grille.png)             | Uniform placement, grid arrangement and snapping             |
| [05-repartition-categories.png](05-repartition-categories.png) | Annual breakdown by category and bill benchmark              |
| [06-bibliotheque.png](06-bibliotheque.png)                     | Library of editable generic device profiles                  |
| [07-fiche-formulaire.png](07-fiche-formulaire.png)             | Manual creation of a device profile                          |
| [08-fiche-json.png](08-fiche-json.png)                         | Synchronized JSON editor and validation status               |
| [09-fiche-json-apercu.png](09-fiche-json-apercu.png)           | Complete JSON example, data preview and annual estimate      |
| [10-usages-appareil.png](10-usages-appareil.png)               | Device settings and quantity                                 |
| [10b-puissance-et-duree.png](10b-puissance-et-duree.png)       | Average power, hours, days and device placement              |
| [11-detail-calcul.png](11-detail-calcul.png)                   | Calculation explained with active use and standby separated  |
| [12-puissance-simulee.png](12-puissance-simulee.png)           | Total power of running, standby and switched-off devices     |
| [13-comparaison-scenario.png](13-comparaison-scenario.png)     | Independent scenario, savings and simple payback             |
| [14-tarif-heures-creuses.png](14-tarif-heures-creuses.png)     | Peak/off-peak tariff and separate standing charge            |
| [15-repere-facture.png](15-repere-facture.png)                 | Optional comparison with twelve months of actual consumption |
| [16-import-wattpack.png](16-import-wattpack.png)               | Preview before importing a home and its scenarios            |
| [17-palette-theme.png](17-palette-theme.png)                   | Theme palette and custom accent color                        |
| [18-accueil-sombre.png](18-accueil-sombre.png)                 | Annual estimate with a dark lavender theme                   |
| [19-plateau-sombre.png](19-plateau-sombre.png)                 | 3D board with a dark lavender theme                          |
| [20-choix-langue.png](20-choix-langue.png)                     | Switch between French and English without reloading          |

## Regenerate

```powershell
npm start
# In another terminal / Dans un autre terminal :
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/playwright'
node scripts/screenshots-devices.mjs macbook-pro-14 en
```
