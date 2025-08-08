# Gandara Scheduler

## 📋 Description

Une application de gestion d'agenda timeline développée avec Next.js et React. Cette application permet de planifier et visualiser les rendez-vous, chantiers, absences et autres événements pour les employés d'une entreprise sous forme de timeline interactive.

## ✨ Fonctionnalités

### 🎨 Gestion des rendez-vous
- **Création de rendez-vous** avec formulaire avancé
- **Système de couleurs** personnalisables (fond, bordure, texte)
- **Types de rendez-vous** : Chantiers, Absences, Autres
- **Durées flexibles** adaptées au type d'événement

### 👥 Gestion des équipes
- **Différents pôles**
- **Types de contrats** : CDI et Intérim
- **Avatars** et informations détaillées

### 📅 Interface timeline
- **Vue calendrier** avec grille par jours
- **Drag & Drop** pour déplacer les rendez-vous
- **Filtrage** par équipe, type, employé
- **Navigation** intuitive dans le temps
- **Responsive design** adaptatif

### 🎛️ Paramètres avancés
- **Panel d'options** extensible
- **Jours non-travaillés** configurables
- **Couleurs personnalisées** avec palette
- **Icônes** catégorisées (28 icônes disponibles)

### 📊 Données d'échantillon
- **20 projets de chantiers** variés
- **12 types d'absences** différents
- **15 autres événements** (réunions, formations, etc.)

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

Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 🛠️ Technologies utilisées

- **Framework** : Next.js 15 (App Router)
- **Language** : TypeScript
- **Styling** : CSS modules + SCSS
- **State Management** : React Context
- **Icons** : Images personnalisées
- **Fonts** : Geist (optimisé Vercel)

## 📁 Structure du projet

```
app/
├── calendrier/           # Module principal du calendrier
│   ├── components/       # Composants UI
│   │   ├── AppointmentForm.tsx    # Formulaire de création/édition
│   │   ├── AppointmentItem.tsx    # Affichage d'un RDV
│   │   ├── CalendarGrid.tsx       # Grille du calendrier
│   │   ├── DayCell.tsx            # Cellule d'un jour
│   │   ├── Modal.tsx              # Modal générique
│   │   └── ...
│   ├── context/          # Contexts React
│   ├── pages/           # Pages du calendrier
│   ├── types/           # Types TypeScript
│   └── utils/           # Utilitaires et constantes
├── datasource.ts        # Données d'échantillon
├── globals.css          # Styles globaux
└── layout.tsx          # Layout principal
```

## 🎨 Personnalisation

### Couleurs
10 couleurs prédéfinies disponibles avec noms français :
- Bleu, Vert, Orange, Violet, Indigo, Rose, Rouge, Cyan, etc.

### Types d'événements
- **Chantiers** : Projets de construction (3-12 jours)
- **Absences** : Congés, maladie, formation (1-5 jours)  
- **Autres** : Réunions, déplacements, maintenance (1-3 jours)

### Équipes et employés
Configuration flexible des équipes et employés dans `datasource.ts`

## 🔧 Développement

### Scripts disponibles
```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # Linting TypeScript/ESLint
```

### Ajout de nouvelles fonctionnalités
1. Créer les composants dans `app/calendrier/components/`
2. Définir les types dans `app/calendrier/types/`
3. Ajouter les données dans `datasource.ts` si nécessaire



**Développé avec ❤️ pour la gestion d'équipes et de projets**
