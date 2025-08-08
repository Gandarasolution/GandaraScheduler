# Documentation Technique - Gandara Scheduler

## 📋 Vue d'ensemble

Gandara Scheduler est une application web de gestion d'agenda timeline développée avec Next.js 15 et TypeScript. Elle permet de planifier et visualiser les rendez-vous, chantiers, absences et autres événements pour les employés d'une entreprise sous forme de timeline interactive.

## 🏗️ Architecture Technique

### Technologies Principales

- **Framework** : Next.js 15 (App Router)
- **Language** : TypeScript 5.x
- **Styling** : CSS Modules + SCSS personnalisé
- **State Management** : React Context API
- **Drag & Drop** : react-dnd
- **Date Management** : date-fns
- **Build Tool** : Turbopack (Next.js)

### Structure des Dossiers

```
app/
├── calendrier/                 # Module principal calendrier
│   ├── components/            # Composants React réutilisables
│   │   ├── AppointmentForm.tsx      # Formulaire CRUD rendez-vous
│   │   ├── AppointmentItem.tsx      # Affichage individuel RDV
│   │   ├── CalendarGrid.tsx         # Grille principale timeline
│   │   ├── DayCell.tsx              # Cellule de jour
│   │   ├── Modal.tsx                # Système modal réutilisable
│   │   └── ...
│   ├── context/              # Contexts React pour état global
│   │   ├── SelectedAppointmentContext.tsx
│   │   └── SelectedCellContext.tsx
│   ├── pages/               # Pages de l'application
│   │   └── index.tsx        # Page principale calendrier
│   ├── types/               # Définitions TypeScript
│   │   └── index.ts         # Interfaces et types
│   ├── utils/               # Utilitaires et helpers
│   │   ├── constants.ts     # Constantes globales
│   │   ├── dates.ts         # Utilitaires de dates
│   │   └── filters.ts       # Logique de filtrage
│   └── image/               # Assets visuels
├── datasource.ts            # Données d'échantillon
├── globals.css              # Styles globaux
└── layout.tsx              # Layout principal
```

## 🔧 Composants Principaux

### 1. AppointmentForm
**Responsabilité** : Formulaire de création/édition de rendez-vous
**Fonctionnalités** :
- Système de couleurs triple (fond, bordure, texte)
- Panel d'options extensible
- Aperçu en temps réel
- Validation des données
- Gestion des jours non-travaillés

### 2. CalendarGrid
**Responsabilité** : Grille principale du calendrier
**Fonctionnalités** :
- Affichage timeline horizontale
- Groupement par équipes/pôles
- Scroll synchronisé
- Filtrage avancé
- Responsive design

### 3. AppointmentItem
**Responsabilité** : Affichage et interaction avec un rendez-vous
**Fonctionnalités** :
- Drag & Drop
- Redimensionnement
- Menu contextuel
- Sélection visuelle
- Calcul automatique de position

### 4. Modal
**Responsabilité** : Système de fenêtres modales
**Fonctionnalités** :
- Design cohérent (#009580)
- Fermeture par Escape
- Overlay cliquable
- Responsive

## 📊 Gestion des Données

### Types Principaux

```typescript
interface Employee {
  id: number;
  name: string;
  avatar?: string;
  groupId?: number;
  type: 'employee' | 'interim';
  pole: string;
}

interface Appointment {
  id: number;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  employeeId: number | string;
  type: "Chantier" | "Absence" | "Autre";
  color: string;
  borderColor: string;
  textColor: string;
}
```

### Source de Données

Le fichier `datasource.ts` contient :
- **35 employés** répartis en 8 équipes
- **20 chantiers** avec noms réalistes
- **12 types d'absences**
- **15 autres événements**
- **Générateur intelligent** de rendez-vous

### Algorithme de Génération

```typescript
function generateAppointments(employees: Employee[]): Appointment[] {
  // 2-5 rendez-vous par employé
  // Durées selon type : Chantier(3-12j), Absence(1-5j), Autre(1-3j)
  // Évite les week-ends
  // Projets collaboratifs
  // Distribution sur 60 jours
}
```

## 🎨 Système de Design

### Palette de Couleurs

- **Thème principal** : #009580 (vert Gandara)
- **10 couleurs** prédéfinies avec noms français
- **Contraste optimisé** pour accessibilité

### Dimensions Standards

```typescript
const CELL_WIDTH = 45;          // Largeur cellule jour
const CELL_HEIGHT = 40;         // Hauteur cellule
const EMPLOYEE_COLUMN_WIDTH = 150; // Colonne employés
const MARGIN_BETWEEN_TEAMS = 20;   // Espacement équipes
```

## 🔄 Gestion d'État

### Contexts React

1. **SelectedAppointmentContext**
   - Sélection globale de rendez-vous
   - Coordination entre composants

2. **SelectedCellContext**
   - Sélection de cellules dans la grille
   - Navigation clavier

### Flux de Données

```
User Action → Event Handler → State Update → UI Re-render
```

## 🚀 Fonctionnalités Avancées

### Drag & Drop (react-dnd)

```typescript
const [{ isDragging }, drag] = useDrag({
  type: 'APPOINTMENT',
  item: { appointment, source: 'calendar' },
  collect: (monitor) => ({
    isDragging: monitor.isDragging(),
  }),
});
```

### Responsive Design

- **Desktop** : Grille horizontale multi-employés
- **Mobile** : Vue verticale optimisée tactile
- **Breakpoint** : 768px

### Système de Filtres

```typescript
interface Filter {
  id: string;
  field: string;
  type: FilterType;
  value: any;
  label: string;
}
```

## 🧪 Génération de Données

### Logique Métier

1. **Éviter week-ends** : `getRandomWeekDate()`
2. **Durées adaptées** : Variable selon type d'événement
3. **Projets d'équipe** : Assignation collaborative
4. **Distribution géographique** : Répartition sur timeline

### Patterns Réalistes

- **Chantiers** : Projets longs (3-12 jours)
- **Absences** : Courtes durées (1-5 jours)
- **Réunions** : Ponctuel (1-3 jours)
- **Équipes** : Collaborations sur gros projets

## 📱 Optimisations

### Performance

- **Memoization** : React.memo sur composants lourds
- **useMemo/useCallback** : Calculs coûteux
- **Lazy Loading** : Chargement différé composants

### UX/UI

- **Feedback visuel** : États de chargement/erreur
- **Interactions fluides** : Animations CSS
- **Accessibilité** : Navigation clavier, contraste

## 🔧 APIs et Intégrations

### Hooks Personnalisés

```typescript
const { selectedAppointment, setSelectedAppointment } = useSelectedAppointment();
const { selectedCell, setSelectedCell } = useSelectedCell();
```

### Utilitaires Dates

```typescript
import { isHoliday, isWeekend } from '../utils/dates';
import { format, addDays, eachDayOfInterval } from 'date-fns';
```

## 🚦 Workflow de Développement

### Conventions de Code

1. **TypeScript strict** : Types explicites partout
2. **Composants fonctionnels** : Hooks uniquement
3. **Documentation JSDoc** : Tous les exports publics
4. **Nommage cohérent** : PascalCase composants, camelCase variables

### Structure des Composants

```typescript
/**
 * Documentation JSDoc complète
 */
interface ComponentProps {
  // Props typées
}

const Component: React.FC<ComponentProps> = ({ props }) => {
  // Hooks en premier
  // État local
  // Fonctions helpers
  // useEffect
  // Render
};
```


**Auteur** : Gandara Solutions  
**Version** : 1.0.0  
**Dernière MAJ** : 8 Août 2025  
