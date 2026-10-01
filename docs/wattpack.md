# Format Watt Wallet — version 1

Un fichier `.wattpack` est un ZIP autonome contenant `manifest.json` à sa racine et, si nécessaire, des fichiers `assets/<assetId>.glb`. Aucun autre fichier n’est accepté. Les noms sont sensibles à la casse. Le manifeste est en UTF-8 et suit [wattpack.schema.json](wattpack.schema.json).

## Deux types de paquets

```json
{
  "format": "watt-wallet",
  "version": 1,
  "kind": "library",
  "definitions": []
}
```

Dans un paquet réel, `definitions` contient au moins une fiche. Une seule fiche et une collection utilisent la même structure.

```json
{
  "format": "watt-wallet",
  "version": 1,
  "kind": "home",
  "home": {
    "id": "mon-logement",
    "name": "Mon logement",
    "tariff": {
      "mode": "base",
      "basePrice": 0.25,
      "peakPrice": 0.27,
      "offPeakPrice": 0.2,
      "subscription": 180
    },
    "devices": [],
    "scenarios": []
  }
}
```

Le logement peut aussi contenir observedAnnualKwh, repère facultatif recopié depuis 12 mois de factures. Il est comparé aux kWh estimés de la référence et voyage avec le logement exporté. Son absence est acceptée pour les anciens fichiers.

Les scénarios portent `id`, `name`, `initialCost`, `tariff` et `devices`. Ils se comparent à la référence du logement parent, sans graphe de dépendances entre scénarios.

## Fiches et instances

Une `DeviceDefinition` contient `id`, `name`, `brand`, `reference`, `category`, `nominalW`, `energy`, `defaultUsage`, `visual` et `notes`. Marque, référence et notes peuvent être des chaînes vides. La puissance nominale est indicative ; elle n’entre pas automatiquement dans le calcul. Les champs facultatifs simulatedRunningW et simulatedStandbyW servent uniquement à la puissance simulée. En leur absence, cette vue utilise la moyenne en marche, la moyenne du cycle si sa durée est connue, ou indique une puissance inconnue. Les fichiers existants sans ces champs restent valides.

`energy` choisit exactement une méthode :

- `{ "method": "power", "activeW": 100, "standbyW": 0 }`
- `{ "method": "cycle", "kwhPerCycle": 0.8, "standbyW": 0 }`
- `{ "method": "annual", "kwhPerYear": 210 }`

`defaultUsage` et l’usage de chaque instance contiennent `hoursPerDay`, `daysPerYear`, `cyclesPerWeek`, `cycleHours`, `offPeakPercent`. Les champs inactifs sont conservés pour faciliter le changement de méthode ; seule la méthode choisie détermine le calcul. Les pourcentages sont compris entre 0 et 100, jamais entre 0 et 1.

Une `DeviceInstance` contient `id`, une copie complète `definition`, `usage`, `quantity` (entier ≥ 1) et `position: { x, z }`. Le schéma accepte X et Z entre −10 000 et +10 000. Le plateau et les limites de déplacement sont calculés à partir du nombre d’objets, de leurs dimensions affichées et de leurs positions ; leur taille ne constitue pas une donnée persistante. Les unités du plateau sont abstraites, pas des mètres.

Les états temporaires arrêté, veille et en marche du simulateur ne sont pas stockés ni exportés et ne changent pas les résultats annuels. Les résultats ne sont pas stockés : ils sont recalculés. Les montants sont en euros TTC, puissances en watts, énergie en kWh, durées en heures. L’année vaut 365 jours / 8 760 heures et le modèle par cycle utilise 52 semaines.

## Visuels

Silhouette intégrée : `{ "kind": "builtin", "id": "fridge" }`.

Identifiants stables : `bulb`, `radiator`, `ac`, `boiler`, `fridge`, `freezer`, `tv`, `pc`, `laptop`, `router`, `washer`, `dishwasher`, `oven`, `hob`.

Modèle personnalisé : `{ "kind": "glb", "assetId": "mon-frigo", "fallback": "fridge" }`, associé à `assets/mon-frigo.glb`. Plusieurs fiches peuvent utiliser la même ressource. Le GLB d’origine est exporté sans conversion ; origine et volume sont normalisés uniquement lors du rendu. Les animations ne sont pas jouées.

GLB 2 autonome exclusivement : un bloc JSON, éventuellement un bloc BIN ; aucune URI dans les images ou buffers. Textures PNG/JPEG embarquées, pas de Draco, Meshopt, KTX2 ni WebP. Toute extension obligatoire non prise en charge est refusée. La géométrie doit être non vide et bornée ; le chargement de test refuse plus d’un million de triangles. Les textures sont limitées à 4 096 pixels par côté, 32 images et 64 mégapixels au total.

## Validation et limites

- Paquet compressé et somme décompressée ≤ 100 Mio, au plus 200 entrées ; manifeste inclus dans la limite globale de 100 Mio, chaque GLB ≤ 20 Mio.
- ZIP standard, méthodes Store ou Deflate, sans chiffrement, multiparties ni ZIP64. Les chemins absolus, répertoires parents, entrées dupliquées et archives imbriquées sont refusés.
- Vérification des en-têtes, tailles déclarées et effectivement décompressées, CRC32 et références de ressources. L’archive est lue en mémoire, sans extraction des chemins fournis sur disque.
- Manifeste à champs stricts : nombres finis et positifs ou nuls ; quantités entières ; noms non vides ; bornes d’usage ; validation des scénarios comme de la référence. La durée annuelle des cycles ne peut dépasser 8 760 h.
- Au plus 2 000 fiches par bibliothèque, 500 instances par référence/scénario et 50 scénarios par logement. Les limites globales du stockage sont 100 logements et 2 000 fiches.
- Version inconnue : rejet explicite. Aucun traitement partiel ni téléchargement de ressources manquantes.

L’import est préparé et validé, puis présenté à l’utilisateur. La confirmation ajoute des copies avec nouveaux identifiants, remappe les assets partagés et conserve les données déjà présentes. Les références aux fiches sont des snapshots : une fiche du catalogue peut évoluer sans modifier les logements.

## Exemples

- `examples/bibliotheque.wattpack` : les 14 fiches génériques.
- `examples/logement.wattpack` : un logement et un scénario de réduction d’usage du chauffage.
- `examples/modele-personnalise.wattpack` : un GLB triangulaire minimal pour tester les ressources autonomes.
- Les fichiers `.manifest.json` correspondants permettent de lire les exemples sans dézipper.
