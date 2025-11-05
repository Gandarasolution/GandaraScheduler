# FlexibleFrame v2.0 - Guide d'Utilisation Complet

## 🎯 Philosophie

FlexibleFrame est maintenant un composant **ultra-flexible** qui peut s'adapter à n'importe quel projet sans modification. Il suit ces principes :

- **Zero configuration** : Fonctionne avec un minimum de props
- **Composable** : Combine les fonctionnalités nécessaires
- **Extensible** : Override n'importe quelle partie
- **Rétrocompatible** : L'ancienne API fonctionne toujours

---

## 🚀 Exemples d'Utilisation

### Exemple 1 : Usage Simple (Ancienne API - Rétrocompatible)

```typescript
import FlexibleFrame from './FlexibleFrame';

<FlexibleFrame
  groups={[
    { label: 'Groupe 1', span: 3, key: 'g1' },
    { label: 'Groupe 2', span: 2, key: 'g2' }
  ]}
  items={['Col1', 'Col2', 'Col3', 'Col4', 'Col5']}
  mainRef={scrollRef}
>
  <div>Contenu</div>
</FlexibleFrame>
```

**Résultat :** Fonctionne exactement comme avant ! ✅

---

### Exemple 2 : Nouvelle API - Configuration Flexible

```typescript
<FlexibleFrame
  mainRef={scrollRef}
  headers={[
    {
      items: [
        { label: 'Groupe 1', span: 3, key: 'g1' },
        { label: 'Groupe 2', span: 2, key: 'g2' }
      ],
      show: true,
      minHeight: '40px',
      containerClassName: 'bg-blue-100',
      itemClassName: 'font-bold text-center',
    },
    {
      items: [
        { label: 'Col1', span: 1, key: 'c1' },
        { label: 'Col2', span: 1, key: 'c2' },
        { label: 'Col3', span: 1, key: 'c3' },
        { label: 'Col4', span: 1, key: 'c4' },
        { label: 'Col5', span: 1, key: 'c5' }
      ],
      show: true,
      minHeight: '56px',
    }
  ]}
  gridConfig={{
    mode: 'fixed',
    columns: 5,
    cellWidth: 120
  }}
>
  <table>
    {/* ... */}
  </table>
</FlexibleFrame>
```

**Avantages :**
- ✅ Configuration complète de chaque niveau
- ✅ Classes CSS personnalisées
- ✅ Contrôle total sur le rendu

---

### Exemple 3 : Mode Auto (Colonnes Flexibles)

```typescript
<FlexibleFrame
  mainRef={scrollRef}
  gridConfig={{
    mode: 'auto',
    columns: 5,
    minColumnWidth: 100,
    maxColumnWidth: 300
  }}
  headers={[
    {
      items: columns.map(col => ({ label: col.label, span: 1, key: col.key })),
      minHeight: '56px'
    }
  ]}
>
  {/* Contenu */}
</FlexibleFrame>
```

**Résultat :** Colonnes qui s'adaptent automatiquement au contenu entre 100px et 300px.

---

### Exemple 4 : Mode Custom (Template CSS Grid)

```typescript
<FlexibleFrame
  mainRef={scrollRef}
  gridConfig={{
    mode: 'custom',
    template: '100px 1fr 200px minmax(150px, 2fr) auto'
  }}
  headers={[
    {
      items: [
        { label: 'Fixe 100px', span: 1, key: 'c1' },
        { label: 'Flexible', span: 1, key: 'c2' },
        { label: 'Fixe 200px', span: 1, key: 'c3' },
        { label: 'Min-Max', span: 1, key: 'c4' },
        { label: 'Auto', span: 1, key: 'c5' }
      ]
    }
  ]}
>
  {/* Contenu */}
</FlexibleFrame>
```

**Résultat :** Contrôle total sur la disposition CSS Grid.

---

### Exemple 5 : En-têtes Multi-Niveaux (3 niveaux)

```typescript
<FlexibleFrame
  mainRef={scrollRef}
  headers={[
    // Niveau 1 : Super-groupes
    {
      items: [
        { label: 'Q1 2025', span: 6, key: 'q1' },
        { label: 'Q2 2025', span: 6, key: 'q2' }
      ],
      minHeight: '40px',
      containerClassName: 'bg-gray-200',
    },
    // Niveau 2 : Mois
    {
      items: [
        { label: 'Janvier', span: 2, key: 'jan' },
        { label: 'Février', span: 2, key: 'feb' },
        { label: 'Mars', span: 2, key: 'mar' },
        { label: 'Avril', span: 2, key: 'apr' },
        { label: 'Mai', span: 2, key: 'may' },
        { label: 'Juin', span: 2, key: 'jun' }
      ],
      minHeight: '40px',
      containerClassName: 'bg-gray-100',
    },
    // Niveau 3 : Semaines
    {
      items: Array.from({ length: 12 }, (_, i) => ({
        label: `S${i + 1}`,
        span: 1,
        key: `week-${i}`
      })),
      minHeight: '30px',
    }
  ]}
  gridConfig={{
    mode: 'fixed',
    columns: 12,
    cellWidth: 80
  }}
>
  {/* Planning */}
</FlexibleFrame>
```

**Résultat :** Structure hiérarchique parfaite pour un planning multi-niveaux.

---

### Exemple 6 : Rendu Personnalisé des En-têtes

```typescript
<FlexibleFrame
  mainRef={scrollRef}
  headers={[
    {
      customRender: (
        <>
          {columns.map((col, index) => (
            <div
              key={col.key}
              className="custom-header"
              onClick={() => handleSort(col.key)}
            >
              <span>{col.label}</span>
              <SortIcon direction={sortConfig[col.key]} />
            </div>
          ))}
        </>
      ),
      minHeight: '56px'
    }
  ]}
  gridConfig={{
    mode: 'custom',
    template: columnWidths.map(w => `${w}px`).join(' ')
  }}
>
  {/* Tableau triable */}
</FlexibleFrame>
```

**Résultat :** Contrôle total sur le rendu avec logique de tri.

---

### Exemple 7 : Mode Bare (Sans Conteneurs)

```typescript
<FlexibleFrame
  mainRef={scrollRef}
  bareMode={true}
  headers={[
    {
      items: columns.map(c => ({ label: c, span: 1, key: c }))
    }
  ]}
  gridConfig={{
    mode: 'auto',
    columns: columns.length
  }}
>
  {/* Contenu */}
</FlexibleFrame>
```

**Résultat :** Uniquement la grille, sans les conteneurs de style (pour intégration dans un design existant).

---

### Exemple 8 : Rendu Personnalisé par Item

```typescript
<FlexibleFrame
  mainRef={scrollRef}
  headers={[
    {
      items: [
        {
          label: 'Image',
          span: 1,
          key: 'img',
          className: 'w-[70px]',
          render: () => <div className="flex justify-center">📷</div>
        },
        {
          label: 'Nom',
          span: 1,
          key: 'name',
          render: () => (
            <div className="flex items-center gap-2">
              <span>Nom</span>
              <FilterIcon />
            </div>
          )
        },
        {
          label: 'Actions',
          span: 1,
          key: 'actions',
          render: () => (
            <div className="flex justify-end gap-2">
              <button>✏️</button>
              <button>🗑️</button>
            </div>
          )
        }
      ]
    }
  ]}
  gridConfig={{
    mode: 'custom',
    template: '70px 1fr 120px'
  }}
>
  {/* Tableau */}
</FlexibleFrame>
```

**Résultat :** Chaque colonne a son propre rendu personnalisé.

---

### Exemple 9 : Kanban Board

```typescript
<FlexibleFrame
  mainRef={scrollRef}
  bareMode={true}
  headers={[
    {
      items: [
        { label: 'À faire', span: 1, key: 'todo' },
        { label: 'En cours', span: 1, key: 'progress' },
        { label: 'Fait', span: 1, key: 'done' }
      ],
      minHeight: '60px',
      containerClassName: 'bg-gradient-to-r from-blue-100 to-green-100',
      itemClassName: 'flex items-center justify-center font-bold text-lg'
    }
  ]}
  gridConfig={{
    mode: 'fixed',
    columns: 3,
    cellWidth: 300
  }}
>
  <div className="col-span-1 p-4 bg-blue-50">
    {/* Cartes "À faire" */}
  </div>
  <div className="col-span-1 p-4 bg-yellow-50">
    {/* Cartes "En cours" */}
  </div>
  <div className="col-span-1 p-4 bg-green-50">
    {/* Cartes "Fait" */}
  </div>
</FlexibleFrame>
```

**Résultat :** Board Kanban complet avec colonnes de statut.

---

### Exemple 10 : Timeline avec Zoom

```typescript
const [cellWidth, setCellWidth] = useState(120);

<FlexibleFrame
  mainRef={scrollRef}
  headers={[
    {
      items: months.map(m => ({ label: m.label, span: m.days, key: m.key })),
      minHeight: '40px'
    },
    {
      items: days.map(d => ({ label: d, span: 1, key: d })),
      minHeight: '30px'
    }
  ]}
  gridConfig={{
    mode: 'fixed',
    columns: days.length,
    cellWidth: cellWidth  // ✅ Dynamique !
  }}
>
  {/* Timeline content */}
</FlexibleFrame>

<button onClick={() => setCellWidth(prev => prev + 10)}>Zoom +</button>
<button onClick={() => setCellWidth(prev => prev - 10)}>Zoom -</button>
```

**Résultat :** Timeline zoomable dynamiquement.

---

## 📊 Comparaison API

| Fonctionnalité | Ancienne API | Nouvelle API |
|----------------|--------------|--------------|
| **En-têtes simples** | `groups`, `items` | `headers` array |
| **Multi-niveaux** | ❌ Non supporté | ✅ Illimité |
| **Grid mode** | `useAutoCells`, `cellWidth` | `gridConfig.mode` |
| **Custom render** | `customItemHeaders` | `headers[].customRender` |
| **Classes CSS** | `classNameHeader` | `headers[].containerClassName` |
| **Styles inline** | ❌ Non supporté | ✅ `headers[].containerStyle` |
| **Rendu par item** | ❌ Non supporté | ✅ `item.render()` |
| **Mode bare** | ❌ Non supporté | ✅ `bareMode={true}` |

---

## 🎓 Bonnes Pratiques

### ✅ À FAIRE

1. **Utiliser `bareMode` pour les designs personnalisés**
   ```typescript
   <FlexibleFrame bareMode={true} />
   ```

2. **Définir `gridConfig.mode` explicitement**
   ```typescript
   gridConfig={{ mode: 'auto' }}
   ```

3. **Utiliser `item.render()` pour les colonnes complexes**
   ```typescript
   { label: 'Actions', span: 1, key: 'actions', render: () => <ActionButtons /> }
   ```

4. **Mémoïser les configurations complexes**
   ```typescript
   const headers = useMemo(() => [...], [deps]);
   ```

### ❌ À ÉVITER

1. **Ne pas mélanger ancienne et nouvelle API**
   ```typescript
   // ❌ Éviter
   <FlexibleFrame groups={...} headers={...} />
   ```

2. **Ne pas oublier le `mainRef`**
   ```typescript
   // ❌ Obligatoire
   <FlexibleFrame mainRef={scrollRef} />
   ```

3. **Ne pas utiliser `mode: 'custom'` sans `template`**
   ```typescript
   // ❌ Éviter
   gridConfig={{ mode: 'custom' }}  // Manque template
   ```

---

## 🚀 Migration depuis v1.0

### Étape 1 : Pas de changement nécessaire !

L'ancienne API fonctionne toujours :

```typescript
// ✅ Continue de fonctionner
<FlexibleFrame
  groups={groups}
  items={items}
  mainRef={ref}
/>
```

### Étape 2 : Migrer vers la nouvelle API (optionnel)

```typescript
// Nouvelle API
<FlexibleFrame
  mainRef={ref}
  headers={[
    { items: groups.map(g => ({ ...g, span: g.span, key: g.key })) },
    { items: items.map((item, i) => ({ label: item, span: 1, key: `item-${i}` })) }
  ]}
  gridConfig={{
    mode: 'fixed',
    columns: items.length,
    cellWidth: 120
  }}
/>
```

---

## 🎉 Conclusion

FlexibleFrame v2.0 est maintenant **vraiment flexible** ! Vous pouvez :

- ✅ Créer des layouts simples en 3 lignes
- ✅ Construire des structures complexes multi-niveaux
- ✅ Personnaliser chaque aspect du rendu
- ✅ L'utiliser dans n'importe quel projet sans modification
- ✅ Garder votre code existant qui fonctionne toujours

**Le composant s'adapte à vos besoins, pas l'inverse !** 🚀
