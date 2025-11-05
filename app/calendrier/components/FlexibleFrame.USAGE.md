# FlexibleFrame v2.0 - Guide d'Utilisation Simplifié

## 🎯 Philosophie

Le rendu est **TOUJOURS** contrôlé par l'appelant (le composant parent). FlexibleFrame ne fait **QUE** la structure et la grille. Vous avez le contrôle total du HTML/CSS depuis votre composant.

---

## ✨ Interface Simplifiée

```typescript
interface HeaderItem {
  span: number;              // Nombre de colonnes occupées
  key: string;               // Identifiant unique
  className?: string;        // Classes CSS personnalisées
  style?: CSSProperties;     // Styles inline
  render: () => ReactNode;   // OBLIGATOIRE - Votre rendu personnalisé
}

interface HeaderLevel {
  items: HeaderItem[];                 // Liste des items de ce niveau
  show?: boolean;                      // Afficher ce niveau (défaut: true)
  stickyTop?: number | string;         // Position sticky
  minHeight?: number | string;         // Hauteur minimale
  containerClassName?: string;         // Classes du conteneur
  containerStyle?: CSSProperties;      // Styles du conteneur
  customRender?: ReactNode;            // Rendu complet du niveau (override items)
}
```

---

## 📖 Exemples d'Utilisation

### Exemple 1 : Tableau Simple avec En-têtes Triables

```typescript
import FlexibleFrame from './FlexibleFrame';

function MyDataTable() {
  const columns = ['Nom', 'Email', 'Statut'];
  const [sortKey, setSortKey] = useState('nom');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  return (
    <FlexibleFrame
      mainRef={scrollRef}
      gridConfig={{
        mode: 'fixed',
        columns: 3,
        cellWidth: 200
      }}
      headers={[
        {
          items: columns.map((col, i) => ({
            span: 1,
            key: `col-${i}`,
            render: () => (
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort(col)}
              >
                <span className="font-bold">{col}</span>
                {sortKey === col && (
                  <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            )
          })),
          minHeight: '50px',
          containerClassName: 'bg-white border-b'
        }
      ]}
    >
      {/* Votre contenu de tableau */}
    </FlexibleFrame>
  );
}
```

---

### Exemple 2 : Timeline avec Groupes de Mois et Jours

```typescript
function MyTimeline() {
  const months = [
    { name: 'Janvier', days: 31 },
    { name: 'Février', days: 28 }
  ];

  return (
    <FlexibleFrame
      mainRef={scrollRef}
      gridConfig={{
        mode: 'fixed',
        columns: 59, // Total des jours
        cellWidth: 50
      }}
      headers={[
        // Niveau 1 : Mois
        {
          items: months.map(month => ({
            span: month.days,
            key: month.name,
            render: () => (
              <div className="bg-blue-500 text-white text-center py-2 font-bold">
                {month.name}
              </div>
            )
          })),
          minHeight: '40px'
        },
        // Niveau 2 : Jours
        {
          items: Array.from({ length: 59 }, (_, i) => ({
            span: 1,
            key: `day-${i}`,
            render: () => (
              <div className="text-center text-xs py-1 border-r">
                {(i % 31) + 1}
              </div>
            )
          })),
          minHeight: '30px'
        }
      ]}
    >
      {/* Contenu du planning */}
    </FlexibleFrame>
  );
}
```

---

### Exemple 3 : Utiliser `customRender` pour un Niveau Complet

Si vous voulez rendre tout le niveau d'un coup (au lieu d'item par item) :

```typescript
function MyCustomTable() {
  return (
    <FlexibleFrame
      mainRef={scrollRef}
      gridConfig={{
        mode: 'auto',
        columns: 5
      }}
      headers={[
        {
          // Au lieu de définir items, utilisez customRender
          customRender: (
            <>
              {columns.map((col, i) => (
                <div key={i} className="your-custom-style">
                  <YourComplexComponent column={col} />
                </div>
              ))}
            </>
          ),
          minHeight: '60px',
          containerClassName: 'custom-container'
        }
      ]}
    >
      {/* Contenu */}
    </FlexibleFrame>
  );
}
```

---

### Exemple 4 : Headers avec Images et Actions

```typescript
function ProductTable() {
  const columns = [
    { name: 'Image', icon: '📷' },
    { name: 'Produit', icon: '🏷️' },
    { name: 'Prix', icon: '💰' },
    { name: 'Actions', icon: '⚙️' }
  ];

  return (
    <FlexibleFrame
      mainRef={scrollRef}
      gridConfig={{
        mode: 'custom',
        template: '80px 1fr 150px 100px'
      }}
      headers={[
        {
          items: columns.map(col => ({
            span: 1,
            key: col.name,
            render: () => (
              <div className="flex items-center gap-2 p-3 bg-gray-50">
                <span className="text-2xl">{col.icon}</span>
                <span className="font-semibold">{col.name}</span>
              </div>
            )
          })),
          minHeight: '56px'
        }
      ]}
    >
      {/* Lignes de produits */}
    </FlexibleFrame>
  );
}
```

---

### Exemple 5 : Kanban Board (3 Colonnes)

```typescript
function KanbanBoard() {
  const statuses = ['À faire', 'En cours', 'Terminé'];

  return (
    <FlexibleFrame
      mainRef={scrollRef}
      gridConfig={{
        mode: 'fixed',
        columns: 3,
        cellWidth: 300
      }}
      headers={[
        {
          items: statuses.map(status => ({
            span: 1,
            key: status,
            render: () => (
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 text-center font-bold rounded-t-lg">
                {status}
                <span className="ml-2 bg-white text-blue-500 px-2 py-1 rounded-full text-sm">
                  {tasks[status].length}
                </span>
              </div>
            )
          })),
          minHeight: '60px'
        }
      ]}
    >
      {/* Colonnes de cartes */}
    </FlexibleFrame>
  );
}
```

---

## 🎨 GridConfig Modes

### Mode `fixed` : Largeur uniforme
```typescript
gridConfig={{
  mode: 'fixed',
  columns: 10,
  cellWidth: 120  // Chaque colonne = 120px
}}
```

### Mode `auto` : Colonnes flexibles
```typescript
gridConfig={{
  mode: 'auto',
  columns: 10,
  minColumnWidth: 100,  // Min 100px
  maxColumnWidth: 300   // Max 300px
}}
```

### Mode `custom` : Template CSS Grid
```typescript
gridConfig={{
  mode: 'custom',
  template: '100px 1fr 200px minmax(150px, 2fr)'
}}
```

---

## ✅ Avantages de cette Approche

1. **Contrôle Total** : Vous décidez du HTML/CSS depuis votre composant
2. **Réutilisable** : FlexibleFrame ne contient AUCUNE logique métier
3. **Flexible** : Ajouter autant de niveaux que vous voulez
4. **Type-Safe** : TypeScript vous guide
5. **Performance** : Pas de rendu inutile dans FlexibleFrame

---

## 🚫 Ce que FlexibleFrame NE FAIT PAS

- ❌ Ne gère PAS le tri
- ❌ Ne gère PAS les filtres
- ❌ Ne gère PAS les données
- ❌ Ne contient PAS de styles métier

**FlexibleFrame = Structure + Grille. C'EST TOUT !**

---

## 💡 Tips

### Tip 1 : Mémoïsez vos headers
```typescript
const headers = useMemo(() => [
  {
    items: columns.map(col => ({
      span: 1,
      key: col.id,
      render: () => <MyHeader col={col} />
    }))
  }
], [columns]);
```

### Tip 2 : Composants réutilisables
```typescript
const SortableHeader = ({ label, isActive, direction, onClick }) => (
  <div onClick={onClick} className="cursor-pointer">
    {label} {isActive && (direction === 'asc' ? '↑' : '↓')}
  </div>
);

// Utilisation
render: () => <SortableHeader {...headerProps} />
```

### Tip 3 : Pas de headers
```typescript
<FlexibleFrame
  mainRef={ref}
  gridConfig={{ mode: 'fixed', columns: 5 }}
  headers={[]}  // Pas d'en-têtes !
>
  {/* Juste le contenu */}
</FlexibleFrame>
```

---

## 🎉 Conclusion

FlexibleFrame est maintenant **vraiment simple** :
- **Vous contrôlez** le rendu via `render()`
- **FlexibleFrame gère** la grille et le sticky
- **Zéro magie** : Ce que vous voyez est ce que vous obtenez

**Simple. Flexible. Puissant.** 🚀
