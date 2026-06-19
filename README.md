# Team Sandwich — MTG Card Fetcher

Ce projet est une application web moderne et performante permettant de rechercher des cartes Magic: The Gathering (MTG), de charger des collections entières de sets ou d'importer des listes de cartes depuis un fichier texte, puis de comparer leurs prix et d'accéder directement aux liens de recherche de diverses boutiques de jeux spécialisées.

##  Fonctionnalités principales

- **Recherche de cartes** : Recherche instantanée par nom exact ou partiel via l'API Scryfall.
- **Comparateur de boutiques** : Liens directs et logos de nombreuses boutiques de cartes et de jeux (Face to Face, Levalet, Secret Desk, Cardhoarder, Gamekeeper, Expedition, TCGPlayer, MTGTop8, etc.).
- **Chargement de collections (Sets)** : Permet de lister toutes les cartes associées à un set de cartes spécifique.
- **Importation de fichiers** : Importez une liste de cartes depuis un fichier `.txt` pour charger et comparer les cartes à la volée.
- **Pagination dynamique** : Filtre d'affichage flexible par multiples de 15 cartes (15, 30, 45, 60, 75 ou "Toutes").
- **Détails de carte isolés** : Système d'extension propre ("Afficher plus") qui n'impacte que la carte cliquée sans étirer les autres éléments de la grille.
- **Interface responsive & Moderne** : Design soigné avec menu latéral type hamburger, effets de verre (glassmorphism), transitions fluides et mode sombre natif.

## 🛠️ Technologies utilisées

- **HTML5** : Structure sémantique de l'application.
- **CSS3 (Vanilla)** : Design system complet et sur mesure, sans framework externe, garantissant une légèreté maximale et des animations fluides.
- **JavaScript (ES6+)** : Logique applicative, gestion du routage par URL, manipulation du DOM et intégration des API.
- **Scryfall API** : API REST publique utilisée pour récupérer les données de cartes en temps réel.
- **Google Fonts** : Intégration de la police d'écriture moderne *Inter*.

##  Structure du projet

Le projet est organisé de manière professionnelle pour séparer proprement le code source, les styles et les ressources multimédias :

```
teamsandwich/
├── assets/
│   ├── icons/
│   │   └── favicon.ico          # Icône du site dans l'onglet du navigateur
│   └── images/
│       └── IMG_6262.jpg         # Logo officiel de Team Sandwich
├── css/
│   ├── card.css                 # Styles spécifiques pour la page de résultats
│   └── styles.css               # Design system et styles globaux
├── js/
│   ├── card.js                  # Logique de la page de résultats (fetch, pagination, expansion)
│   └── script.js                # Logique de la page d'accueil (menu, redirections, import de fichier)
├── card.html                    # Page dédiée à l'affichage des résultats de recherche
├── index.html                   # Page d'accueil principale
└── README.md                    # Documentation du projet (ce fichier)
```

##  Comment exécuter le projet localement

1. Cloner ou télécharger ce dépôt dans le répertoire de votre choix.
2. Lancez un serveur de développement local (par exemple avec l'extension **Live Server** sur VS Code, ou avec `python -m http.server 5500` dans votre terminal).
3. Ouvrez votre navigateur à l'adresse `http://localhost:5500` pour accéder à l'application.
