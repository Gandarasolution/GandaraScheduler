# Gandara Scheduler

## 📋 Description

Une application de gestion d'agenda timeline haute performance développée avec Next.js et React. Cette application permet de planifier et visualiser les rendez-vous, chantiers, absences et autres événements pour les employés d'une entreprise sous forme de timeline interactive.

Elle intègre des fonctionnalités avancées comme la virtualisation pour gérer de grands volumes de données, le drag & drop fluide, et une interface responsive.

## ✨ Fonctionnalités

### 🚀 Performance & Optimisation
- **Scroll Infini** : Chargement dynamique des jours lors du défilement horizontal.
- **Memoization Avancée** : Utilisation intensive de `React.memo`, `useCallback` et `useMemo` pour éviter les re-renders inutiles.
- **Optimisation du Context** : Séparation des composants conteneurs et de présentation (`IntervalCell`) pour isoler les mises à jour de contexte (sélection) et éviter de re-rendre toute la grille.
- **DOM Flattening** : Structure HTML aplatie au maximum (suppression des wrappers inutiles dans `EmployeeRow`, `GroupRow`, `DayCell`) pour réduire la complexité du DOM et améliorer la fluidité du navigateur.
- **Event Delegation** : Gestion optimisée des événements (survol, clics) pour réduire la création de fonctions et l'impact mémoire.

### 🎨 Gestion des rendez-vous
- **Création de rendez-vous** avec formulaire avancé
- **Système de couleurs** personnalisables (fond, bordure, texte)
- **Types de rendez-vous** : Chantiers, Absences, Autres
- **Durées flexibles** adaptées au type d'événement
- **Drag & Drop** : Déplacement intuitif des rendez-vous avec surlignement en temps réel de la cellule cible.

### 👥 Gestion des équipes
- **Différents pôles**
- **Types de contrats** : CDI et Intérim
- **Avatars** et informations détaillées
- **Filtrage** par équipe, type, employé

### 📅 Interface timeline
- **Vue calendrier** avec grille par jours
- **Navigation** intuitive dans le temps
- **Responsive design** adaptatif (Mobile & Desktop)
- **Zoom** et configuration de l'affichage

### 🎛️ Paramètres avancés
- **Panel d'options** extensible
- **Jours non-travaillés** configurables
- **Couleurs personnalisées** avec palette
- **Icônes** catégorisées (28 icônes disponibles)

## 🛠️ Technologies utilisées

- **Framework** : Next.js 16 (App Router)
- **Language** : TypeScript
- **Styling** : Tailwind CSS, SCSS, Bootstrap
- **State Management** : React Context, React Hooks
- **Drag & Drop** : React DnD
- **Dates** : date-fns, date-holidays
- **Testing** : Jest, React Testing Library

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- npm, yarn, pnpm ou bun

### Démarrage rapide

```bash
# Cloner le projet
git clone [url-du-repo]
cd mon-agenda-timeline

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:8080](http://localhost:8080) dans votre navigateur (port configuré dans `package.json`).

### Tests

```bash
# Lancer les tests unitaires
npm test
```

## 📁 Structure du projet

```
app/
├── calendrier/           # Module principal du calendrier
│   ├── components/       # Composants UI
│   │   ├── Calendar/     # Composants spécifiques au calendrier (Grid, Row, Cell...)
│   │   ├── dnd/          # Composants liés au Drag & Drop
│   │   ├── forms/        # Formulaires
│   │   ├── modals/       # Modales de configuration
│   │   └── ui/           # Composants UI génériques
│   ├── context/          # Contexts React (Selection, etc.)
│   ├── hooks/            # Hooks personnalisés (Logique métier, Scroll, Interactions)
│   ├── types/            # Types TypeScript
│   └── utils/            # Utilitaires et constantes
├── datasource.ts         # Données d'échantillon
├── globals.scss          # Styles globaux
└── layout.tsx            # Layout principal
```

## 🎨 Personnalisation

### Couleurs
10 couleurs prédéfinies disponibles avec noms français :
- Bleu, Vert, Orange, Violet, Indigo, Rose, Rouge, Cyan, etc.

### Types d'événements
- **Chantiers** : Projets de construction (3-12 jours)
- **Absences** : Congés, maladie, formation (1-5 jours)  
- **Autres** : Réunions, déplacements, maintenance (1-3 jours)
