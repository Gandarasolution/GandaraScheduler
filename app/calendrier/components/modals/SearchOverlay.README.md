# SearchOverlay - Composant Générique et Réutilisable

## 📋 Vue d'ensemble

Le composant `SearchOverlay` est maintenant **générique et réutilisable** dans n'importe quel projet. Il ne dépend plus de types spécifiques comme `Evenement`, `Appointment`, etc.

## 🔄 Migration depuis l'ancienne version

### Avant (Version spécifique)
```tsx
<SearchOverlay
  isOpen={isOpen}
  onClose={onClose}
  eventSearchInput={eventSearchInput}
  setEventSearchInput={setEventSearchInput}
  filteredEvents={filteredEvents}
  selectedCell={selectedCell}
  addAppointmentFromSearch={addAppointmentFromSearch}
  isFullDay={isFullDay}
/>
```

### Après (Version générique)
```tsx
<SearchOverlay
  isOpen={isOpen}
  onClose={onClose}
  searchInput={eventSearchInput}                    // ✅ Renommé
  setSearchInput={setEventSearchInput}              // ✅ Renommé
  items={filteredEvents}                            // ✅ Renommé
  placeholder="Rechercher un événement..."          // ✅ Nouveau
  renderItem={(event, index) => (                   // ✅ Nouveau - Rendu personnalisé
    <DraggableSource
      key={`${event.label}-${event.id}-${index}`}
      id={event.id}
      title={event.label}
      type={(event as any).type as "Chantier" | "Absence" | "Autre"}
      className="w-full"
    />
  )}
  onItemAction={selectedCell ? (event) => {         // ✅ Nouveau - Action sur item
    addAppointmentFromSearch(
      {
        description: event.label,
        startDate: new Date(selectedCell.date),
        endDate: new Date((isFullDay ? addHours(selectedCell.date, 23) : addHours(selectedCell.date, 11)).setMinutes(59, 59)),
        employeeId: selectedCell.employeeId,
        type: (event as any).type.toLowerCase() as "chantier" | "absence" | "autre",
      } as Appointment,
      event as Evenement,
      false
    );
  } : undefined}
  actionLabel="+"                                   // ✅ Nouveau
  enableDragDetection={true}                        // ✅ Nouveau
/>
```

## 📐 Nomenclature des données

### Structure minimale requise

Vos données doivent respecter l'interface `SearchableItem` :

```typescript
interface SearchableItem {
  id: string | number;  // Identifiant unique (requis)
  label: string;        // Texte principal affiché (requis)
  [key: string]: any;   // Autres propriétés (optionnel)
}
```

### Exemple avec vos propres données

```typescript
// 1. Étendre l'interface SearchableItem
interface MyCustomData extends SearchableItem {
  id: number;
  label: string;
  customProp1: string;
  customProp2: number;
  // ... autres propriétés
}

// 2. Préparer les données
const myData: MyCustomData[] = [
  { id: 1, label: 'Item 1', customProp1: 'value1', customProp2: 100 },
  { id: 2, label: 'Item 2', customProp1: 'value2', customProp2: 200 }
];

// 3. Utiliser le composant
<SearchOverlay
  isOpen={isOpen}
  onClose={handleClose}
  searchInput={searchText}
  setSearchInput={setSearchText}
  items={myData}
  renderItem={(item) => (
    <div>
      <h3>{item.label}</h3>
      <p>{item.customProp1}: {item.customProp2}</p>
    </div>
  )}
/>
```

## 🎨 Props du composant

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `isOpen` | `boolean` | ✅ | État d'ouverture de l'overlay |
| `onClose` | `() => void` | ✅ | Callback de fermeture |
| `searchInput` | `string` | ✅ | Valeur de l'input de recherche |
| `setSearchInput` | `(input: string) => void` | ✅ | Callback pour modifier l'input |
| `items` | `T[]` | ✅ | Liste des items filtrés |
| `placeholder` | `string` | ❌ | Placeholder de l'input (défaut: "Rechercher...") |
| `emptyStateConfig` | `object` | ❌ | Configuration des états vides |
| `renderItem` | `(item: T, index: number) => ReactNode` | ❌ | Fonction de rendu personnalisée |
| `onItemAction` | `(item: T) => void` | ❌ | Callback lors du clic sur l'action |
| `actionLabel` | `string` | ❌ | Label du bouton d'action (défaut: "+") |
| `enableDragDetection` | `boolean` | ❌ | Active la détection du drag & drop (défaut: true) |
| `className` | `string` | ❌ | Classes CSS additionnelles |
| `style` | `React.CSSProperties` | ❌ | Style inline |
| `maxWidth` | `string` | ❌ | Largeur max (défaut: "2xl") |
| `maxHeight` | `string` | ❌ | Hauteur max de la liste (défaut: "50vh") |
| `position` | `object` | ❌ | Position de l'overlay |

## 🎯 Exemples d'utilisation

### 1. Utilisation basique (sans rendu personnalisé)

```tsx
<SearchOverlay
  isOpen={isOpen}
  onClose={onClose}
  searchInput={search}
  setSearchInput={setSearch}
  items={[
    { id: 1, label: 'Item 1' },
    { id: 2, label: 'Item 2' }
  ]}
/>
```

### 2. Avec rendu personnalisé

```tsx
<SearchOverlay
  isOpen={isOpen}
  onClose={onClose}
  searchInput={search}
  setSearchInput={setSearch}
  items={products}
  renderItem={(product) => (
    <div className="flex justify-between w-full py-2">
      <span>{product.label}</span>
      <span className="text-gray-500">{product.price}€</span>
    </div>
  )}
/>
```

### 3. Avec action sur les items

```tsx
<SearchOverlay
  isOpen={isOpen}
  onClose={onClose}
  searchInput={search}
  setSearchInput={setSearch}
  items={users}
  onItemAction={(user) => handleSelectUser(user)}
  actionLabel="Sélectionner"
/>
```

### 4. Configuration avancée

```tsx
<SearchOverlay
  isOpen={isOpen}
  onClose={onClose}
  searchInput={search}
  setSearchInput={setSearch}
  items={items}
  placeholder="Rechercher un produit..."
  maxWidth="lg"
  maxHeight="60vh"
  position={{ top: '20%', left: '50%' }}
  style={{ transform: 'translateX(-50%)' }}
  emptyStateConfig={{
    noInput: {
      icon: <MyCustomIcon />,
      title: "Commencez à chercher",
      description: "Tapez pour voir les résultats"
    },
    noResults: {
      title: "Rien trouvé",
      description: "Essayez une autre recherche"
    }
  }}
  enableDragDetection={false}
/>
```

## 🔧 Fonctionnalités

### ✅ Inclus
- ✅ Recherche en temps réel
- ✅ Gestion du clavier (ESC pour fermer)
- ✅ Support du drag & drop (React DnD)
- ✅ États vides personnalisables
- ✅ Rendu par défaut ou personnalisé
- ✅ Action optionnelle sur les items
- ✅ Position et taille configurables
- ✅ Générique TypeScript avec types sécurisés
- ✅ Responsive et adaptatif

### 🎨 États gérés
1. **Aucune recherche** : État affiché quand l'input est vide
2. **Aucun résultat** : État affiché quand la recherche ne retourne rien
3. **Résultats** : Affichage de la liste des items

### 🎭 Drag & Drop
- Le composant détecte automatiquement quand un drag est en cours
- L'overlay devient invisible pendant le drag (pour ne pas gêner)
- Désactivable avec `enableDragDetection={false}`

## 🚀 Avantages de la version générique

| Avant | Après |
|-------|-------|
| ❌ Couplé aux types du projet | ✅ Fonctionne avec n'importe quelle donnée |
| ❌ Logique métier dans le composant | ✅ Composant agnostique, logique externalisée |
| ❌ Difficile à réutiliser | ✅ Réutilisable partout |
| ❌ Pas de personnalisation | ✅ Hautement personnalisable |
| ❌ TypeScript limité | ✅ Générique avec types sécurisés |

## 📝 Notes importantes

1. **Migration progressive** : L'ancien code fonctionnera toujours, vous pouvez migrer progressivement
2. **Types génériques** : Le composant utilise `<T extends SearchableItem>` pour la sécurité des types
3. **Fichier d'exemples** : Voir `SearchOverlay.example.tsx` pour des exemples complets
4. **Rétrocompatibilité** : Adaptez simplement les props comme indiqué dans la section Migration

## 🎓 Pour aller plus loin

Consultez le fichier `SearchOverlay.example.tsx` qui contient :
- 4 exemples d'utilisation différents
- Cas d'usage avec calendrier (ancien comportement)
- Cas d'usage avec produits
- Cas d'usage avec utilisateurs
- Utilisation minimaliste

## 📦 Version

**v2.0.0** - Generic & Reusable
- Composant complètement générique
- Support TypeScript amélioré
- Documentation complète
- Exemples d'utilisation
