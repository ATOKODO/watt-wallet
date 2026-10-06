[English](../en/wattpack.md) · [Français](../fr/wattpack.md) · [Accueil](../../README.fr.md)

# Format `.wattpack` — version 1

Un `.wattpack` est une archive ZIP autonome pour des fiches d’appareils ou un logement et ses scénarios. Le fichier UTF-8 `manifest.json` est à la racine. Les visuels personnalisés référencés sont placés dans `assets/<assetId>.glb`. Aucun autre fichier n’est accepté ; les noms sont sensibles à la casse.

Le [schéma JSON](../wattpack.schema.json) décrit la structure. La validation à l’exécution contrôle aussi la cohérence des usages, les identifiants, les références, l’intégrité ZIP et le contenu GLB. Changer la langue de l’application ne change pas le format.

## Structure du paquet

```text
exemple.wattpack
├── manifest.json
└── assets/
    └── custom-model.glb
```

La ligne `assets/` désigne le préfixe des fichiers, pas une entrée de répertoire ZIP supplémentaire. Omettre les ressources personnalisées pour des silhouettes intégrées uniquement. Une ressource référencée plusieurs fois est embarquée une seule fois. Les octets GLB d’origine sont conservés sans conversion.

| Champ du manifeste | Valeur                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| `format`           | `"watt-wallet"`                                                        |
| `version`          | `1`                                                                    |
| `kind`             | `"library"` ou `"home"`                                                |
| `definitions`      | Requis pour `library` : une ou plusieurs `DeviceDefinition` complètes. |
| `home`             | Requis pour `home` : un `Home` complet.                                |

Les objets du manifeste sont stricts : les champs inconnus sont rejetés. Un paquet d’une seule fiche utilise la même structure de bibliothèque qu’une collection. Un logement embarque des copies de fiches, pas des liens vers un catalogue externe.

## Fiche d’appareil complète

Cette `DeviceDefinition` est valide pour l’éditeur JSON de bibliothèque. Elle représente un appareil d’exemple de 100 W utilisé cinq heures par jour, pas une caractéristique constructeur. Sans veille et avec une quantité de un, il utilise **182,5 kWh/an**.

```json
{
  "id": "example-device",
  "name": "Appareil exemple",
  "brand": "",
  "reference": "",
  "category": "Électroménager",
  "nominalW": 150,
  "simulatedRunningW": 100,
  "simulatedStandbyW": 0,
  "energy": {
    "method": "power",
    "activeW": 100,
    "standbyW": 0
  },
  "defaultUsage": {
    "hoursPerDay": 5,
    "daysPerYear": 365,
    "cyclesPerWeek": 3,
    "cycleHours": 2,
    "offPeakPercent": 0
  },
  "visual": {
    "kind": "builtin",
    "id": "pc"
  },
  "notes": "Exemple modifiable ; renseignez les valeurs de votre équipement."
}
```

L’application gère `id` dans l’éditeur : identité attribuée à la création et conservée à la modification. Le champ reste obligatoire dans le contrat public. Marque, référence et notes sont des champs requis mais peuvent être des chaînes vides. `nominalW` est indicatif, pas la puissance automatiquement choisie pour le calcul.

`simulatedRunningW` et `simulatedStandbyW` sont facultatifs. Ils concernent uniquement la simulation temporaire de puissance. Les anciens fichiers sans ces champs restent valides ; un zéro explicite est une valeur connue. Consulter les [règles de simulation](calculations.md#puissance-simulée-et-repère-de-facture) pour les valeurs utilisées en leur absence.

### Contrats d’énergie et d’usage

`energy` choisit exactement l’une de ces structures :

| Méthode  | Champs requis                                |
| -------- | -------------------------------------------- |
| `power`  | `method: "power"`, `activeW`, `standbyW`     |
| `cycle`  | `method: "cycle"`, `kwhPerCycle`, `standbyW` |
| `annual` | `method: "annual"`, `kwhPerYear`             |

Ne pas ajouter les champs d’une autre méthode d’énergie. La valeur annuelle inclut déjà la veille.

`defaultUsage` et `usage` d’une instance exigent les cinq champs : `hoursPerDay`, `daysPerYear`, `cyclesPerWeek`, `cycleHours` et `offPeakPercent`. Les champs inactifs sont conservés, mais seule la méthode choisie contribue au calcul. Les pourcentages vont de 0 à 100, pas de 0 à 1.

Les catégories valides restent françaises dans les deux langues : `Chauffage`, `Eau chaude`, `Électroménager`, `Informatique & TV`, `Cuisson`, `Éclairage & autres`. Traduire leurs libellés d’affichage, pas les valeurs enregistrées.

## Exemple de manifeste de bibliothèque

Ce manifeste complet contient une fiche par cycles. Le placer dans une archive ZIP sous le nom `manifest.json`, sans ressources ; renommer simplement du JSON en `.wattpack` ne crée pas une archive.

```json
{
  "format": "watt-wallet",
  "version": 1,
  "kind": "library",
  "definitions": [
    {
      "id": "example-washer",
      "name": "Lave-linge exemple",
      "brand": "",
      "reference": "",
      "category": "Électroménager",
      "nominalW": 2000,
      "energy": {
        "method": "cycle",
        "kwhPerCycle": 0.8,
        "standbyW": 0
      },
      "defaultUsage": {
        "hoursPerDay": 0,
        "daysPerYear": 365,
        "cyclesPerWeek": 3,
        "cycleHours": 2,
        "offPeakPercent": 0
      },
      "visual": {
        "kind": "builtin",
        "id": "washer"
      },
      "notes": "Exemple modifiable : 124,8 kWh/an selon cet usage par défaut."
    }
  ]
}
```

## Logements, instances et scénarios

Une `DeviceInstance` contient `id`, une fiche complète dans `definition`, tous les champs d’usage dans `usage`, une `quantity` entière et `position: { x, z }`. Modifier la fiche de bibliothèque ne change pas cette copie embarquée. L’usage de l’instance pilote son estimation ; `defaultUsage` reste dans la copie de fiche.

Un `Tariff` exige `mode` (`base` ou `hp-hc`), `basePrice`, `peakPrice`, `offPeakPrice` et `subscription`. Les prix sont des montants par kWh ; l’abonnement est un montant par an, interprétés dans la devise choisie dans l’application (EUR par défaut, ou USD). Le manifeste V1 ne stocke aucun code de devise et n’exporte pas cette préférence ; indiquer aux destinataires la devise à sélectionner. Aucune conversion de change n’est effectuée. Les champs tarifaires inactifs restent requis. Tous les montants sont saisis TTC.

Un `Home` contient `id`, `name`, `tariff`, `devices` et `scenarios`, ainsi que `observedAnnualKwh` facultatif. Un `Scenario` contient `id`, `name`, `initialCost`, `tariff` et `devices`. Il se compare à la référence actuelle du parent, sans graphe de dépendances entre scénarios. `initialCost` est le surcoût initial dans la même devise que les tarifs.

Voici un paquet minimal valide avec référence et scénario vides. Il illustre l’imbrication ; les exemples téléchargeables plus bas incluent des appareils installés.

```json
{
  "format": "watt-wallet",
  "version": 1,
  "kind": "home",
  "home": {
    "id": "example-home",
    "name": "Logement exemple",
    "tariff": {
      "mode": "base",
      "basePrice": 0.25,
      "peakPrice": 0.27,
      "offPeakPrice": 0.2,
      "subscription": 180
    },
    "devices": [],
    "scenarios": [
      {
        "id": "example-scenario",
        "name": "Scénario exemple",
        "initialCost": 120,
        "tariff": {
          "mode": "base",
          "basePrice": 0.25,
          "peakPrice": 0.27,
          "offPeakPrice": 0.2,
          "subscription": 180
        },
        "devices": []
      }
    ]
  }
}
```

`observedAnnualKwh`, s’il est présent, est le repère de douze mois de factures pour la référence. Son absence est acceptée dans les anciens fichiers. Les résultats sont recalculés à l’ouverture, pas stockés dans le paquet. Les positions sont en unités abstraites ; X/Z vont de −10 000 à +10 000. Les limites du plateau sont dérivées du nombre, des dimensions affichées et des positions des objets, pas persistées.

États de puissance temporaires, caméra, accrochage, thème, couleur et langue ne sont pas exportés. Un logement emporte uniquement ses copies installées et leurs dépendances, pas les fiches inutilisées ou les autres logements.

## Visuels et ressources GLB

Visuel intégré : `{"kind":"builtin","id":"fridge"}`.

Les identifiants intégrés stables sont `bulb`, `radiator`, `ac`, `boiler`, `fridge`, `freezer`, `tv`, `pc`, `laptop`, `router`, `washer`, `dishwasher`, `oven` et `hob`.

Visuel personnalisé : `{"kind":"glb","assetId":"custom-fridge","fallback":"fridge"}`, associé à `assets/custom-fridge.glb`. `assetId` utilise 1 à 100 lettres ASCII, chiffres, tirets bas ou tirets. Le repli est un identifiant intégré. Plusieurs fiches peuvent référencer la même ressource.

Les GLB acceptés respectent :

- GLB version 2, un bloc JSON et éventuellement un bloc BIN, données embarquées ; aucune URI dans les buffers ou images ni dépendance externe.
- Textures PNG/JPEG embarquées ; ni Draco, Meshopt, KTX2 ou WebP. Les extensions obligatoires non prises en charge sont refusées.
- Géométrie non vide et finie ; le chargement de test refuse plus d’un million de triangles.
- Budget conservateur de géométrie décodée avant chargement de **64 Mio par GLB**, couvrant vues binaires, accessors, tableaux sans buffer, strides et copies sparse.
- Au plus **32 images**, **4 096 pixels par côté** et **64 mégapixels** au total.

Les octets originaux sont partagés sans transformation. Origine et volume normalisés ne concernent que le rendu ; les animations ne sont pas jouées. L’extension `.glb` seule ne garantit pas la compatibilité. Importer le modèle par formulaire avant de référencer une ressource locale depuis le JSON.

## Validation et limites

| Élément                                 | Limite                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Archive compressée et total décompressé | 100 Mio chacun, manifeste inclus.                                                         |
| Entrées d’archive                       | 200 maximum.                                                                              |
| Chaque fichier GLB                      | 20 Mio maximum.                                                                           |
| Fiches de bibliothèque                  | 2 000 par paquet et bibliothèque locale.                                                  |
| Instances                               | 500 par référence ou scénario ; quantité de 1 à 10 000 par instance.                      |
| Scénarios                               | 50 par logement.                                                                          |
| Logements locaux                        | 100.                                                                                      |
| Nom de fiche/logement/scénario          | 1 à 100 caractères ; les espaces de bord des noms de fiches sont retirés.                 |
| Identifiants                            | 1 à 120 caractères ; identifiants de ressources soumis à la règle plus stricte ci-dessus. |
| Marque/référence et notes               | 100 caractères chacun pour marque/référence ; 2 000 pour les notes.                       |
| Champs numériques généraux non négatifs | Finis, au plus 1 000 000 000 ; usages et positions ont des bornes plus strictes.          |

Les heures/jour vont de 0 à 24, jours/an de 0 à 365, part HC de 0 à 100 et durée de cycle de 0 à 8 760 heures. La durée annuelle des cycles ne peut dépasser 8 760 heures ; une veille par cycle non nulle exige une durée positive. Les doublons d’identifiants de fiches dans une bibliothèque, de scénarios dans un logement et d’instances dans une configuration sont refusés.

Le ZIP utilise Store ou Deflate, sans chiffrement, multiparties ou ZIP64. Chemins absolus, traversées de répertoires parents, entrées dupliquées, archives imbriquées et chemins inconnus sont refusés. En-têtes, tailles déclarées et décompressées, CRC32 et références sont contrôlés. L’archive est traitée en mémoire sans extraction sur disque des chemins fournis. Versions inconnues, modèles manquants et scénarios invalides entraînent un rejet avant modification de l’espace de travail ; aucun import partiel ni téléchargement externe n’est effectué.

## Import et exemples

La validation prépare un aperçu. La confirmation ajoute des copies, remappe les identifiants de fiches/logements/scénarios/instances et les références de ressources partagées, puis sauvegarde localement. Les éléments existants ne sont pas écrasés. Réimporter crée une autre copie. Une reprise du même import échoué conserve ses identités préparées et les ressources originales.

Le dépôt inclut :

- [Bibliothèque générique](../../examples/bibliotheque.wattpack) et [manifeste lisible](../../examples/bibliotheque.manifest.json) : 14 fiches modifiables.
- [Logement et scénario](../../examples/logement.wattpack) et [manifeste lisible](../../examples/logement.manifest.json) : comparaison d’usage du chauffage.
- [Paquet avec modèle personnalisé](../../examples/modele-personnalise.wattpack) : GLB triangulaire autonome minimal.

Les noms et notes stockés restent ceux des exemples, y compris à l’ouverture en anglais. `npm run examples` régénère le schéma et ces paquets. Consulter le [guide développeur](development.md) pour les commandes et le [guide utilisateur](user-guide.md#partager-et-sauvegarder) pour les parcours d’échange.
