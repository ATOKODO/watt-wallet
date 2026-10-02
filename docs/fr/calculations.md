[English](../en/calculations.md) · [Français](../fr/calculations.md) · [Accueil](../../README.fr.md)

# Calculs et estimations

Watt Wallet calcule à partir des valeurs saisies. Il ne récupère pas de données de compteur en direct, ne certifie pas les caractéristiques constructeur et ne modélise pas les pertes thermiques du logement. Les prix ci-dessous sont des exemples de calcul, pas des tarifs fournisseur.

## Puissance, énergie et coût

| Unité | Signification                                              | Exemple                                                            |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| W     | Puissance : vitesse à laquelle l’électricité est utilisée. | Un appareil utilise en moyenne 100 W en marche.                    |
| kW    | 1 000 W.                                                   | 1 500 W = 1,5 kW.                                                  |
| kWh   | Énergie accumulée dans le temps.                           | 1 kW pendant une heure consomme 1 kWh.                             |
| €/kWh | Prix de l’énergie.                                         | 182,5 kWh à 0,25 €/kWh coûtent 45,625 € avant arrondi d’affichage. |

La puissance nominale (`nominalW`) est indicative et n’est pas utilisée automatiquement dans le calcul annuel ou le simulateur de puissance. La moyenne en marche peut être inférieure au maximum nominal, notamment pour un appareil à cycles ou thermostat. Utiliser si possible une moyenne mesurée ou justifiée et indiquer sa source.

L’année conventionnelle vaut **365 jours / 8 760 heures**. Les cycles utilisent **52 semaines**, et non 365/7. Aucun arrondi intermédiaire n’est appliqué ; seul l’affichage est arrondi selon la langue choisie. La devise reste l’euro.

## Trois méthodes exclusives

Choisir une méthode par fiche ou appareil installé. Les champs d’usage inactifs sont conservés pour faciliter le changement de méthode, mais ne contribuent pas au calcul d’énergie de la méthode choisie.

| Méthode                   | Énergie de fonctionnement pour un appareil      |
| ------------------------- | ----------------------------------------------- |
| **Puissance × durée**     | `activeW × hoursPerDay × daysPerYear / 1000`    |
| **Énergie par cycle**     | `kwhPerCycle × cyclesPerWeek × 52`              |
| **Consommation annuelle** | `kwhPerYear`, fonctionnement et veille compris. |

Pour un radiateur, saisir les heures équivalentes à la puissance indiquée. Par exemple, un radiateur fonctionnant à ses 1 500 W pendant l’équivalent de cinq heures par jour sur 150 jours utilise **1 125 kWh/an**. L’application ne déduit pas cette durée de la température, de la météo, de l’isolation ou de la surface.

### Exemple : puissance et durée

Pour 100 W, cinq heures par jour et 365 jours :

```text
100 × 5 × 365 / 1000 = 182,5 kWh/an
```

Avec une veille nulle, un appareil utilise 182,5 kWh/an. Deux appareils identiques utilisent **365 kWh/an**.

### Exemple : cycles

Pour 0,8 kWh par cycle et trois cycles par semaine :

```text
0,8 × 3 × 52 = 124,8 kWh/an
```

La durée du cycle n’est pas nécessaire pour calculer cette énergie de fonctionnement. Elle sert au calcul d’une veille non nulle et à l’estimation de puissance en marche déduite de l’énergie par cycle.

### Exemple : énergie annuelle

Un réfrigérateur renseigné à 210 kWh/an utilise **210 kWh/an** pour une quantité de un ou **420 kWh/an** pour une quantité de deux. Cette valeur est tout compris : la veille n’est pas ajoutée à nouveau et les champs de durée ou cycles ne la modifient pas.

## Veille et quantité

Pour les méthodes puissance et cycles, la veille s’applique à toutes les heures restantes de l’année conventionnelle, y compris les jours hors saison :

```text
Heures actives (puissance) = hoursPerDay × daysPerYear
Heures actives (cycles) = cycleHours × cyclesPerWeek × 52
Énergie de veille = standbyW × (8760 − heures actives) / 1000
Énergie du groupe = (énergie active + énergie de veille) × quantity
```

Si l’appareil est débranché pendant ces heures restantes, saisir zéro pour la veille. Le modèle ne distingue pas un planning de débranchement d’un planning de veille.

Pour l’exemple à 100 W avec une veille de 1 W :

| Élément               | Calcul                 | kWh/an      |
| --------------------- | ---------------------- | ----------- |
| Fonctionnement        | `100 × 5 × 365 / 1000` | 182,5       |
| Veille                | `1 × 6935 / 1000`      | 6,935       |
| Total, un appareil    | `182,5 + 6,935`        | **189,435** |
| Total, deux appareils | `189,435 × 2`          | **378,87**  |

Pour l’exemple par cycle avec une durée de deux heures et une veille de 0,5 W, les heures actives sont `2 × 3 × 52 = 312`. La veille vaut `0,5 × (8760 − 312) / 1000 = 4,224 kWh`, soit **129,024 kWh/an** pour un appareil.

Les heures/jour sont comprises entre 0 et 24, les jours/an entre 0 et 365 et la part en heures creuses entre 0 et 100. La quantité est un entier entre 1 et 10 000. Les valeurs doivent être finies et non négatives. La durée annuelle des cycles ne peut dépasser 8 760 heures, même sans veille ; la durée d’un cycle doit être positive lorsque sa veille est non nulle.

## Tarifs et abonnement

En **Base**, le coût d’énergie d’un appareil vaut `kWh du groupe × basePrice`.

En **Heures pleines / heures creuses**, le pourcentage saisi s’applique à toute l’énergie de l’appareil, veille incluse :

```text
Fraction HC = offPeakPercent / 100
Prix moyen = peakPrice × (1 − fraction) + offPeakPrice × fraction
Coût d’énergie de l’appareil = kWh du groupe × prix moyen
```

Pour 1 000 kWh, 40 % en heures creuses, 0,27 €/kWh en heures pleines et 0,20 €/kWh en heures creuses :

```text
Heures pleines :  600 × 0,27 = 162 €
Heures creuses :  400 × 0,20 = 80 €
Énergie :                    242 €/an
Abonnement :                 180 €/an
Budget total :               422 €/an
Moyenne mensuelle :          422 € / 12 = 35,166666… €
```

La part en heures creuses vaut **0 %** par défaut : toute l’énergie est facturée au prix des heures pleines tant que vous ne modifiez pas cette part. Il n’y a ni calendrier tarifaire automatique, ni programmation des cycles, ni calendrier Tempo.

L’abonnement est un montant annuel fixe. Il entre dans le budget total du logement sans être réparti entre les appareils ou les coûts d’énergie par catégorie. La moyenne mensuelle l’inclut et reste le total annuel divisé par douze. Un logement sans consommation peut donc conserver un budget égal à son abonnement.

## Parts de consommation et taille 3D

La part d’un groupe vaut `kWh du groupe / kWh totaux du logement`. Les catégories additionnent l’énergie de leurs appareils. L’abonnement n’intervient jamais dans ces pourcentages. Si l’énergie totale est nulle, toutes les parts valent zéro.

En mode **Consommation**, le volume de la boîte englobante normalisée est proportionnel à la part ; l’échelle linéaire suit sa racine cubique. Les pourcentages exacts restent disponibles séparément. Les appareils à énergie nulle deviennent des repères gris. Le mode **Placement** utilise des tailles normalisées uniformes. Le plateau est une représentation comparative, pas un plan aux dimensions physiques.

## Scénarios, économies et retour

Un scénario copie la configuration sélectionnée, mais se compare à la **référence actuelle du logement parent**. Les copies sont indépendantes ; modifier ensuite la référence change la comparaison, pas les équipements enregistrés du scénario.

```text
Énergie économisée = kWh de référence − kWh du scénario
Économie annuelle = budget total de référence − budget total du scénario
Retour simple (années) = surcoût initial / économie annuelle
```

La différence de budget total inclut les changements de prix d’énergie et d’abonnement. Les comparaisons par catégorie portent sur le coût d’énergie uniquement ; une différence d’abonnement n’est attribuée à aucune catégorie.

### Exemple : réduire la durée du chauffage

Trois radiateurs de 1 500 W, 150 jours/an, veille nulle et prix Base de 0,25 €/kWh :

| Résultat                                                            | Référence : 5 h/jour | Scénario : 4 h/jour |
| ------------------------------------------------------------------- | -------------------- | ------------------- |
| Énergie du groupe de radiateurs                                     | 3 375 kWh/an         | 2 700 kWh/an        |
| Coût d’énergie du chauffage                                         | 843,75 €/an          | 675 €/an            |
| Budget avec un abonnement inchangé de 180 € et aucun autre appareil | 1 023,75 €/an        | 855 €/an            |

Le changement économise **675 kWh et 168,75 € par an**. Un surcoût initial de 120 € donne `120 / 168,75 = 0,711111… année`, soit environ **0,7 année** à l’affichage. Les autres appareils inchangés n’affectent pas les économies.

Le retour est indisponible si l’économie annuelle est nulle ou négative. Une économie positive avec un surcoût nul donne zéro année. Ce ratio simple ne tient compte ni du financement, ni de l’actualisation, ni des futurs tarifs, ni des différences d’entretien.

## Puissance simulée et repère de facture

Le simulateur temporaire répond à « quels appareils sont allumés maintenant ? » indépendamment de l’usage annuel :

| État      | Watts utilisés pour le groupe                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arrêt     | Zéro.                                                                                                                                                   |
| En marche | `simulatedRunningW` si renseigné ; sinon `activeW`, ou `kwhPerCycle × 1000 / cycleHours` si la durée du cycle est positive ; multiplié par la quantité. |
| Veille    | `simulatedStandbyW` si renseigné ; sinon `standbyW` pour les méthodes puissance/cycles ; multiplié par la quantité.                                     |

Les puissances manquantes sont signalées et exclues du total. Un zéro explicitement saisi est une valeur connue, pas une donnée manquante. Les fiches en énergie annuelle nécessitent des watts de simulation explicites. La puissance par cycle est une moyenne, pas une pointe ; l’application n’évalue pas les risques de disjonction ni la capacité de l’installation électrique. Les états démarrent à Arrêt, restent distincts par logement/scénario pendant la session et ne sont ni sauvegardés ni exportés.

Pour douze mois de consommation constatée, le repère affiche `observedAnnualKwh − kWh estimés de référence`. Une différence positive signifie que la consommation constatée est supérieure. Il s’agit d’une comparaison sauvegardée, pas d’un ajustement automatique ou d’une identification des appareils.

Consulter le [guide utilisateur](user-guide.md) pour saisir ces valeurs et le [contrat du format](wattpack.md) pour les noms JSON exacts.
