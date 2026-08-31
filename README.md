# Gandara Scheduler

## 📋 Description

Une application de gestion d'agenda timeline haute performance développée avec Next.js et React. Cette application permet de planifier et visualiser les rendez-vous, chantiers, absences et autres événements pour les employés d'une entreprise sous forme de timeline interactive.

Elle intègre des fonctionnalités avancées comme la virtualisation pour gérer de grands volumes de données, le drag & drop fluide, une interface responsive, un système de notifications en temps réel et une gestion complète des droits utilisateurs.

## ✨ Fonctionnalités

### 🚀 Performance & Optimisation
- **Scroll Infini** : Chargement dynamique des jours lors du défilement horizontal.
- **Memoization Avancée** : Utilisation intensive de `React.memo`, `useCallback` et `useMemo` pour éviter les re-renders inutiles.
- **Optimisation du Context** : Séparation des composants conteneurs et de présentation (`IntervalCell`) pour isoler les mises à jour de contexte (sélection) et éviter de re-rendre toute la grille.
- **DOM Flattening** : Structure HTML aplatie au maximum (suppression des wrappers inutiles dans `EmployeeRow`, `GroupRow`, `DayCell`) pour réduire la complexité du DOM et améliorer la fluidité du navigateur.
- **Event Delegation** : Gestion optimisée des événements (survol, clics) pour réduire la création de fonctions et l'impact mémoire.

### 🎨 Gestion des rendez-vous
- **Création de rendez-vous** avec formulaire avancé
- **Rendez-vous multi-jours** : Affichage intelligent des rendez-vous s'étendant sur plusieurs jours avec détection automatique (matin/après-midi/journée complète)
- **Système de couleurs** personnalisables (fond, bordure, texte)
- **Types de rendez-vous** : Chantiers, Absences, Autres
- **Durées flexibles** adaptées au type d'événement
- **Drag & Drop** : Déplacement intuitif des rendez-vous avec surlignement en temps réel de la cellule cible

### 👥 Gestion des équipes et utilisateurs
- **Différents pôles** : Technique, Commercial, Administrative, RH
- **Types de contrats** : CDI et Intérim
- **Avatars** et informations détaillées
- **Filtrage** par équipe, type, employé
- **Base utilisateurs** : 12 utilisateurs fictifs avec emails et avatars

### 🔐 Système de droits et sécurité
- **Rôles utilisateurs** :
  - **Admin** : Accès complet à tous les calendriers et fonctionnalités
  - **User** : Accès limité à son propre calendrier uniquement
- **Filtrage automatique** des données selon les droits
- **Interface adaptative** : Affichage conditionnel des contrôles selon le rôle
- **Sélection automatique** du calendrier pour les utilisateurs standards
- **Indicateur visuel** du mode utilisateur

### 🔔 Système de notifications
- **Panneau de notifications** interactif en temps réel
- **4 types de notifications** : Success, Error, Warning, Info
- **Icônes colorées** selon le type
- **Horodatage relatif** : "Il y a 15min", "Il y a 2h", etc.
- **Compteur de non-lues** avec badge sur l'icône cloche
- **Gestion complète** :
  - Marquer comme lu au clic
  - Suppression individuelle
  - Bouton "Tout effacer"
  - Persistance des notifications
- **Base de données** : 12 notifications pré-chargées par utilisateur
- **Notifications personnalisées** : Demandes de congés, retards chantier, validations, RDV confirmés, etc.

### 📱 Interface Mobile
- **Calendrier mobile** dédié et optimisé
- **Design moderne** avec animations fluides
- **Navigation intuitive** :
  - Sélection de mois
  - Vue calendrier mensuelle
  - Liste de rendez-vous par jour
  - Filtrage matin/après-midi/journée complète
- **Header interactif** :
  - Avatar utilisateur
  - Menu de déconnexion
  - Panneau de notifications
- **Messages contextuels** pour les jours sans rendez-vous
- **Bouton d'action flottant** pour création rapide

### 📅 Interface timeline (Desktop)
- **Vue calendrier** avec grille par jours
- **Navigation** intuitive dans le temps
- **Responsive design** adaptatif (Mobile & Desktop)
- **Zoom** et configuration de l'affichage
- **Mode jour/semaine/mois**

### 🎛️ Paramètres avancés
- **Panel d'options** extensible
- **Jours non-travaillés** configurables (weekends)
- **Couleurs personnalisées** avec palette
- **Icônes** catégorisées (34 icônes disponibles + avatars)
- **Thèmes** : Light/Dark

## 🛠️ Technologies utilisées

- **Framework** : Next.js 16 (App Router)
- **Language** : TypeScript
- **Styling** : Tailwind CSS, SCSS, Bootstrap
- **State Management** : React Context, React Hooks
- **Drag & Drop** : React DnD
- **Dates** : date-fns (avec locale française)
- **Icônes** : Lucide React
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

Ouvrir [http://localhost:3001](http://localhost:3001) dans votre navigateur (port configuré dans `package.json`).

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
│   │   ├── Calendar/     # Composants spécifiques au calendrier
│   │   │   ├── AppointmentItem.tsx      # Affichage d'un rendez-vous
│   │   │   ├── CalendarGrid.tsx         # Grille principale
│   │   │   ├── DesktopCalendarGrid.tsx  # Version desktop
│   │   │   ├── DayCell.tsx              # Cellule de jour
│   │   │   ├── EmployeeRow.tsx          # Ligne employé
│   │   │   ├── GroupRow.tsx             # Ligne groupe
│   │   │   └── MobileCalendar/          # Calendrier mobile
│   │   │       ├── MobileCalendarGrid.tsx
│   │   │       └── AppointmentList.tsx
│   │   ├── dnd/          # Composants liés au Drag & Drop
│   │   ├── forms/        # Formulaires
│   │   ├── interactions/ # Menus et interactions utilisateur
│   │   ├── modals/       # Modales de configuration
│   │   └── ui/           # Composants UI génériques
│   ├── hooks/            # Hooks personnalisés
│   │   ├── useNotifiactions.ts    # Gestion des notifications
│   │   ├── useCalendarInteractions.ts
│   │   ├── useTimeline.ts
│   │   ├── useDataLayer.ts
│   │   └── useAppointmentLogic.ts
│   ├── services/         # Services métier
│   │   └── notificationService.ts
│   ├── types/            # Types TypeScript
│   │   └── index.ts      # User, Employee, Appointment, Notification, etc.
│   └── utils/            # Utilitaires et constantes
├── datasource.ts         # Base de données fictive
│   ├── 112 employés
│   ├── 12 utilisateurs avec rôles
│   ├── 12 notifications par utilisateur
│   ├── 47 événements (chantiers, absences, autres)
│   └── 42 images et icônes
├── globals.scss          # Styles globaux
└── layout.tsx            # Layout principal
```

## 🎨 Personnalisation

### Couleurs
10 couleurs prédéfinies disponibles avec noms français :
- Bleu, Vert, Orange, Violet, Indigo, Rose, Rouge, Cyan, Orange foncé, Lime

### Types d'événements
- **Chantiers** : Projets de construction (3-12 jours)
- **Absences** : Congés, maladie, formation (1-5 jours)  
- **Autres** : Réunions, déplacements, maintenance (1-3 jours)

## 📄 Licence

Propriété de Gandara Solutions © 2026

## 👨‍💻 Auteur

**Gandara Solutions**  
Version 0.5
