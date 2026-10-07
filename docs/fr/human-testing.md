[English](../en/human-testing.md) · [Français](../fr/human-testing.md) · [Accueil](../../README.fr.md)

# Essais humains

Ce parcours de 20 à 30 minutes permet d’essayer l’application avant de transmettre vos retours. La [revue du 7 octobre](verification.md#revue-avant-les-essais-humains-7-octobre-2026) consigne les vérifications automatisées ; ce guide couvre les interactions et plateformes qui demandent encore des essais humains.

## Avant de commencer

Utiliser l’adresse de l’application ou l’installateur Windows fourni par l’organisateur. La documentation et Storybook sont des outils séparés. Créer un logement vide ou utiliser un profil de navigateur distinct. Exporter tout logement et toute bibliothèque existants avant les essais, puis conserver un seul onglet pour le parcours principal. Le retrait d’un appareil installé ne propose pas d’annulation.

Choisir le français ou l’anglais, puis EUR ou USD. Le changement de devise modifie l’affichage sans convertir les montants. Les exemples suivants utilisent EUR et des appareils fictifs, pas des caractéristiques constructeur. L’installateur Windows est non signé et son interface d’installation est en français.

## Parcours principal

| Étape | Action                                                                                                                                                           | Résultat attendu                                                                                                                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Créer un logement vide. Saisir un tarif Base de 0,25 par kWh et un abonnement annuel de 180.                                                                     | Zéro kWh ; l’abonnement contribue toujours au budget.                                                                                                                                              |
| 2     | Créer une fiche **Lampe test** : puissance nominale 150 W, puissance moyenne 100 W, 5 heures/jour, 365 jours/an, veille nulle.                                   | L’usage par défaut estime **182,5 kWh/an**. La puissance nominale ne remplace pas la puissance moyenne dans ce calcul.                                                                             |
| 3     | Ouvrir l’onglet JSON, retirer un champ obligatoire et tenter d’enregistrer. Réinitialiser depuis le formulaire, puis changer le nom par un JSON valide.          | Le texte invalide reste visible et l’enregistrement est bloqué. Les modifications valides se synchronisent avec le formulaire.                                                                     |
| 4     | Ajouter la fiche au logement vide et régler la quantité à deux. Appliquer les modifications.                                                                     | **365 kWh/an** ; énergie **91,25/an**, budget total **271,25/an** avant arrondi d’affichage.                                                                                                       |
| 5     | Cliquer sur le nom de l’appareil, puis sur son bouton crayon.                                                                                                    | Le nom sélectionne l’objet. Le crayon amène aussi le panneau de paramètres à l’écran.                                                                                                              |
| 6     | Ajouter des appareils différents, ranger en grille, déplacer les objets, activer/désactiver l’accrochage, orbiter et zoomer. Alterner Consommation et Placement. | Les objets restent accessibles, le plateau grandit selon le besoin et les positions survivent au rechargement. Placement utilise des tailles uniformes ; Consommation reflète les parts annuelles. |
| 7     | Créer un scénario et retirer le groupe de deux lampes depuis sa ligne.                                                                                           | La référence conserve ses lampes. À tarif et autres équipements inchangés, le scénario économise **365 kWh et 91,25/an**.                                                                          |
| 8     | Saisir un surcoût initial de 100 dans le scénario.                                                                                                               | Le retour simple est d’environ **1,1 an**. Un scénario sans économie positive n’a pas de retour calculable.                                                                                        |
| 9     | Revenir à la référence et mettre le groupe de lampes en marche dans le simulateur de puissance.                                                                  | Les lampes contribuent **200 W**, sans changer la consommation annuelle. Les états marche/veille/arrêt se réinitialisent à la réouverture.                                                         |
| 10    | Essayer le repère de facture, la langue, le mode sombre, la palette et la devise. Recharger ou redémarrer.                                                       | Les données et préférences enregistrées reviennent. Changer la devise conserve les valeurs numériques et les kWh.                                                                                  |
| 11    | Exporter le logement et la bibliothèque, puis les importer dans un autre profil de navigateur ou une autre instance.                                             | L’import présente un aperçu et crée de nouvelles copies. Le logement emporte ses scénarios et modèles ; le destinataire choisit séparément la devise correspondante.                               |

Le budget de l’étape 4 suppose que le logement ne contient que les deux lampes. D’autres appareils inchangés contribuent aux deux totaux et s’annulent dans la comparaison des économies.

En option, importer l’[exemple de modèle personnalisé](../../examples/modele-personnalise.wattpack), ajouter son appareil, exporter et rouvrir le logement. Son GLB est un triangle de test technique, pas un modèle d’appareil.

## Plateformes et récupération

- **Windows :** manipuler les véritables sélecteurs natifs d’import/export, y compris l’annulation. Exporter un logement, le rouvrir et vérifier ses scénarios et son modèle personnalisé. Ces sélecteurs interactifs demandent encore une validation manuelle.
- **Mobile/tablette :** vérifier la bibliothèque juste au-dessus de la carte 3D, les fenêtres, le défilement et les commandes tactiles. Les captures de viewport Chromium ne valident pas les appareils Apple physiques ni Safari.
- **Clavier :** naviguer avec Tab, Entrée et Espace, modifier et retirer des appareils, ouvrir les fenêtres et basculer l’accrochage. Signaler les actions inaccessibles et les focus absents.
- **Deux onglets :** ouvrir un second onglet et modifier les mêmes données. Un onglet obsolète doit signaler le conflit sans écraser les modifications. Exporter ses changements locaux avant de recharger explicitement pour les conserver.
- **Web hors connexion :** charger complètement la version production sur son origine habituelle et laisser son cache se terminer, puis déconnecter et recharger. Le serveur de développement ne fournit pas le cache hors connexion de production.

## Signaler un problème

Indiquer la version, le système, le navigateur/WebView2, le viewport, la langue, la devise et le thème. Décrire les étapes, le résultat attendu, le résultat obtenu et l’effet d’une réouverture. Joindre une capture et, si utile, un `.wattpack` minimal contenant des données fictives.

Signaler aussi les libellés confus, les actions peu claires et les fonctionnalités difficiles à trouver, même lorsqu’elles fonctionnent. Consulter [l’enregistrement et la récupération](user-guide.md#enregistrement-et-récupération) avant d’effacer les données ou de recharger une fenêtre en conflit.
