# FAQ File Organizer 2000

## Activation de votre licence

Paramètres généraux
Configuration de la licence

Clé de licence File Organizer : Clé d'activation requise pour débloquer toutes les fonctionnalités

- L'indicateur de statut montre si la licence est actuellement activée
- Le bouton "Obtenir une licence" redirige vers la page d'achat
- Support pour le développement open-source disponible via le site web

## Que faire en cas d'erreur

Soumettez un [nouveau problème avec les étapes pour reproduire](https://github.com/Nexus-JPF/note-companion/issues/new/choose)

Vous pouvez également activer le mode "debug" et l'ajouter à vos pièces jointes. Mais attention, cela peut divulguer des informations sensibles, vérifiez bien.

## Comment sauvegarder mes articles web avec Obsidian Web Clipper

Obsidian web clipper fonctionne parfaitement avec File Organizer 2000, il permet non seulement d'organiser automatiquement vos clips mais aussi de les formater !

Il suffit d'installer [le web clipper](<[url](https://obsidian.md/clipper)>) et de le configurer pour sauvegarder vos fichiers dans \_FileOrganizer2000/Inbox

Vous pouvez également le combiner avec "AI Templates" et formater automatiquement certains articles avec l'IA.

## J'ai une erreur sur l'organisateur

1. Trop de dossiers
   Problème le plus probable : vous avez trop de dossiers. Vérifiez cet écran dans les paramètres (Vault Access)

Si vous importez des fichiers d'un autre système, essayez de les mettre tous dans un dossier séparé, marquez-le comme ignoré et procédez étape par étape.

## Débogage des problèmes de la barre latérale de l'organisateur

Ouvrez les paramètres développeur, rechargez la barre latérale de l'organisateur en tapant refresh, et montrez-nous vos logs et onglets réseau.

Vous pouvez survoler les logs réseau pour découvrir quelle API cause des problèmes (voir capture d'écran ci-dessous)

Vous pouvez ensuite parcourir les en-têtes, la charge utile et l'aperçu
Prenez une capture d'écran de chaque section et envoyez-la nous.

## Je reçois "Trop de requêtes"

Essayez d'organiser moins de fichiers à la fois. Nous recommandons généralement un maximum de 100 fichiers.

## J'ai des problèmes avec la boîte de réception

Essayez de désactiver "Formatage automatique des documents" dans la boîte de réception. Le formatage automatique peut parfois provoquer des comportements inattendus.

## Générer des diagrammes à partir de notes manuscrites

Mettez à jour la section de traitement d'image pour forcer l'IA à extraire mermaid js de votre image.

## Qu'est-ce que Vault Access ?

Vault Access dans File Organizer 2000 fait référence à la capacité du plugin à gérer et organiser les fichiers dans des dossiers ou chemins spécifiques de votre coffre-fort Obsidian. En configurant les paramètres de Vault Access, vous pouvez spécifier quels dossiers le plugin doit surveiller et organiser.

## Comment puis-je préserver la confidentialité de certains fichiers ?

Vous pouvez préserver la confidentialité de certains fichiers en utilisant la fonction "Ignorer les dossiers" dans les paramètres de File Organizer 2000. Voici comment :

1. Accédez aux paramètres de File Organizer : Naviguez vers la section "Vault Access" ou "Configuration des chemins"
2. Localisez le paramètre "Ignorer les dossiers" : Vous trouverez une option intitulée "Ignorer les dossiers"
3. Spécifiez les dossiers à ignorer : Entrez les chemins des dossiers que vous voulez que le plugin ignore, séparés par des virgules

## Prenez-vous en charge le Front Matter ?

Oui, File Organizer 2000 prend en charge le front matter. Le plugin propose une option pour ajouter des tags similaires directement dans le front matter de vos fichiers Markdown. Pour activer cette fonctionnalité :

1. Naviguez vers l'onglet "Préférences d'organisation"
2. Activez "Ajouter des tags similaires dans le frontmatter"

## Comment fonctionne l'intégration Fabric ?

L'intégration Fabric dans File Organizer 2000 vous permet d'améliorer le formatage de vos documents en utilisant des structures de prompt similaires à Fabric. Voici comment cela fonctionne :

1. Activez le formatage Fabric :
   - Accédez à l'onglet "Expérimental" dans les paramètres du plugin
   - Trouvez l'option "Activer le formatage de type Fabric" et activez-la
2. Téléchargez les prompts Fabric :
   - Une fois activé, un gestionnaire de prompts Fabric apparaîtra
   - Utilisez le gestionnaire de prompts Fabric pour télécharger ou mettre à jour les prompts depuis le dépôt Fabric
3. Appliquez les prompts Fabric :
   - Les prompts téléchargés sont utilisés pour formater vos documents selon les méthodologies Fabric
   - Lors du traitement des fichiers, le plugin applique ces prompts pour améliorer l'organisation et la structure
