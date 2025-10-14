# Système de gestion des images avec compression

## Vue d'ensemble

Ce système gère les images en séparant la **sauvegarde complète** en base de données et l'**affichage compressé** pour optimiser les performances.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Utilisateur   │    │   Compression    │    │   Base de       │
│   Upload        │───▶│   & Traitement   │───▶│   Données       │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                         │
                              ▼                         │
                       ┌──────────────────┐             │
                       │   Cache Images   │◄────────────┘
                       │   Compressées    │
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Affichage      │
                       │   Interface      │
                       └──────────────────┘
```

## Composants

### 1. **imageCompressionUtils.ts**

Utilitaires pour le traitement des images :

- **`processImageFile()`** : Traite un fichier et crée 2 versions
  - Version **complète** (≤ 1920x1920px, qualité 95%)  
  - Version **compressée** (≤ 200x200px, qualité 70%)

- **`compressExistingImage()`** : Compresse une image existante
- **`validateImageFile()`** : Valide format et taille (max 5MB)

### 2. **imageDatabaseService.ts**

Service de gestion BDD avec cache intelligent :

- **`saveImage()`** : Sauvegarde l'image complète en BDD
- **`getCompressedImage()`** : Récupère version compressée (avec cache)
- **`getFullQualityImage()`** : Récupère version complète
- **`updateEntityImage()`** : Met à jour l'image d'une entité

### 3. **DataTableFrame.tsx (modifié)**

Intégration dans l'interface :

- Upload avec traitement automatique
- Affichage des images compressées
- Lazy loading et cache

## Flux de données

### 📤 **Upload d'image**

```typescript
// 1. Utilisateur sélectionne un fichier
const file = event.target.files[0];

// 2. Validation
await validateImageFile(file, 5MB, 2048x2048);

// 3. Traitement (2 versions)
const processed = await processImageFile(file);
// → processed.fullQuality (pour BDD)
// → processed.compressed (pour affichage)

// 4. Sauvegarde BDD (version complète)
const imageId = await imageDatabaseService.saveImage(
  processed.fullQuality,
  file.name,
  entityId,
  entityType
);

// 5. Mise à jour interface (version compressée)
updateUI(processed.compressed);
```

### 📥 **Affichage d'image**

```typescript
// 1. Composant détecte référence BDD
if (imageSrc.startsWith('db://')) {
  const imageId = imageSrc.replace('db://', '');
  
  // 2. Récupération compressée (avec cache)
  const compressed = await imageDatabaseService.getCompressedImage(imageId, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.7
  });
  
  // 3. Affichage
  setDisplayImage(compressed);
}
```

## Avantages

### 🚀 **Performance**
- **Cache intelligent** : Évite les recompressions
- **Lazy loading** : Images chargées à la demande
- **Compression adaptative** : Tailles selon l'usage

### 💾 **Qualité préservée**
- **Sauvegarde complète** : Aucune perte de qualité
- **Multiple résolutions** : Optimisées par contexte
- **Métadonnées conservées** : Dimensions, format, taille

### 🔧 **Flexibilité**
- **Configuration dynamique** : Qualité et tailles ajustables
- **Multiple formats** : JPEG, PNG, GIF, WebP
- **API extensible** : Facile à adapter

## Configuration

### Types d'images selon l'usage :

```typescript
// Pour l'affichage dans les tableaux
{
  maxWidth: 200,
  maxHeight: 200,
  quality: 0.7
}

// Pour les miniatures
{
  maxWidth: 64,
  maxHeight: 64,
  quality: 0.6
}

// Pour l'aperçu haute définition
{
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.9
}
```

## API Backend requise

### Endpoints nécessaires :

```
POST   /api/images                     # Sauvegarder image
GET    /api/images/:id                 # Récupérer métadonnées + compressée
GET    /api/images/:id/full            # Récupérer version complète
DELETE /api/images/:id                 # Supprimer image
GET    /api/images/entity/:type/:id    # Images d'une entité
PUT    /api/images/:id                 # Mettre à jour
```

### Structure BDD suggérée :

```sql
CREATE TABLE images (
  id VARCHAR(36) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  full_quality_data LONGTEXT NOT NULL,
  original_size INT,
  width INT,
  height INT,
  format VARCHAR(50),
  upload_date DATETIME,
  entity_id INT,
  entity_type ENUM('chantier', 'paie'),
  INDEX idx_entity (entity_type, entity_id)
);
```

## Utilisation

### Dans votre composant :

```typescript
import { imageDatabaseService } from './utils/imageDatabaseService';
import { processImageFile } from './utils/imageCompressionUtils';

// Upload
const handleUpload = async (file: File) => {
  const processed = await processImageFile(file);
  const imageId = await imageDatabaseService.saveImage(
    processed.fullQuality,
    file.name,
    entityId,
    'chantier'
  );
  return processed.compressed; // Pour affichage immédiat
};

// Affichage
const loadImage = async (imageId: string) => {
  return await imageDatabaseService.getCompressedImage(imageId, {
    maxWidth: 200,
    maxHeight: 200
  });
};
```

## Gestion du cache

- **Taille max** : 100 images
- **Expiration** : 30 minutes
- **Clé de cache** : `imageId-compressionOptions`
- **Nettoyage automatique** : LRU + TTL

Le système est maintenant prêt pour une gestion optimale des images ! 🎨