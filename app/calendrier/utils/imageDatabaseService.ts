/**
 * Service de gestion des images en base de données
 * Gère la sauvegarde en qualité complète et la récupération compressée
 */

import { compressExistingImage } from './imageCompressionUtils';

/**
 * Interface pour une image en base de données
 */
export interface DatabaseImage {
  /** ID unique de l'image */
  id: string;
  /** Nom du fichier */
  filename: string;
  /** Image en qualité complète (pour la BDD) */
  fullQualityData: string;
  /** Métadonnées */
  metadata: {
    originalSize: number;
    width: number;
    height: number;
    format: string;
    uploadDate: number;
  };
  /** ID de l'entité associée (chantier, événement paie, etc.) */
  entityId: number;
  /** Type d'entité */
  entityType: 'chantier' | 'paie';
}

/**
 * Cache des images compressées pour éviter les recompressions
 */
const imageCache = new Map<string, string>();

/**
 * Configuration du cache
 */
const CACHE_CONFIG = {
  maxSize: 100, // Nombre maximum d'images en cache
  ttl: 30 * 60 * 1000 // 30 minutes en millisecondes
};

/**
 * Service de gestion des images
 */
export class ImageDatabaseService {
  
  /**
   * Sauvegarde une image en base de données
   * @param imageData Image en qualité complète
   * @param filename Nom du fichier
   * @param entityId ID de l'entité associée
   * @param entityType Type d'entité
   * @returns Promise avec l'ID de l'image sauvegardée
   */
  async saveImage(
    imageData: string,
    filename: string,
    entityId: number,
    entityType: 'chantier' | 'paie'
  ): Promise<string> {
    try {
      // Extraction des métadonnées
      const img = new Image();
      const metadata = await new Promise<{ width: number; height: number; size: number }>((resolve, reject) => {
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height,
            size: Math.round((imageData.length * 3) / 4) // Estimation de la taille en bytes
          });
        };
        img.onerror = () => reject(new Error('Impossible de lire les métadonnées'));
        img.src = imageData;
      });

      const imageRecord: Omit<DatabaseImage, 'id'> = {
        filename,
        fullQualityData: imageData,
        metadata: {
          originalSize: metadata.size,
          width: metadata.width,
          height: metadata.height,
          format: imageData.split(';')[0].split(':')[1],
          uploadDate: Date.now()
        },
        entityId,
        entityType
      };

      // TODO: Implémentez ici l'appel à votre API pour sauvegarder en BDD
      // Exemple d'appel API :
      const response = await fetch('/api/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(imageRecord)
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la sauvegarde: ${response.statusText}`);
      }

      const savedImage = await response.json();
      return savedImage.id;

    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'image:', error);
      throw new Error('Impossible de sauvegarder l\'image en base de données');
    }
  }

  /**
   * Récupère une image compressée pour l'affichage
   * @param imageId ID de l'image
   * @param compressionOptions Options de compression
   * @returns Promise avec l'image compressée
   */
  async getCompressedImage(
    imageId: string,
    compressionOptions: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
    } = {}
  ): Promise<string> {
    const cacheKey = `${imageId}-${JSON.stringify(compressionOptions)}`;
    
    // Vérifier le cache
    if (imageCache.has(cacheKey)) {
      return imageCache.get(cacheKey)!;
    }

    try {
      // TODO: Remplacez par votre appel API pour récupérer l'image complète
      const response = await fetch(`/api/images/${imageId}`);
      
      if (!response.ok) {
        throw new Error(`Image non trouvée: ${response.statusText}`);
      }

      const imageRecord: DatabaseImage = await response.json();
      
      // Compresser l'image pour l'affichage
      const compressedImage = await compressExistingImage(
        imageRecord.fullQualityData,
        {
          maxDisplayWidth: compressionOptions.maxWidth || 200,
          maxDisplayHeight: compressionOptions.maxHeight || 200,
          quality: compressionOptions.quality || 0.7
        }
      );

      // Mettre en cache
      this.addToCache(cacheKey, compressedImage);

      return compressedImage;

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'image:', error);
      throw new Error('Impossible de récupérer l\'image');
    }
  }

  /**
   * Récupère l'image en qualité complète
   * @param imageId ID de l'image
   * @returns Promise avec l'image complète
   */
  async getFullQualityImage(imageId: string): Promise<string> {
    try {
      const response = await fetch(`/api/images/${imageId}/full`);
      
      if (!response.ok) {
        throw new Error(`Image non trouvée: ${response.statusText}`);
      }

      const imageRecord: DatabaseImage = await response.json();
      return imageRecord.fullQualityData;

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'image complète:', error);
      throw new Error('Impossible de récupérer l\'image complète');
    }
  }

  /**
   * Met à jour l'image associée à une entité
   * @param entityId ID de l'entité
   * @param entityType Type d'entité
   * @param newImageData Nouvelle image en qualité complète
   * @param filename Nom du fichier
   * @returns Promise avec l'ID de la nouvelle image
   */
  async updateEntityImage(
    entityId: number,
    entityType: 'chantier' | 'paie',
    newImageData: string,
    filename: string
  ): Promise<string> {
    try {
      // Supprimer l'ancienne image si elle existe
      await this.deleteEntityImage(entityId, entityType);

      // Sauvegarder la nouvelle image
      return await this.saveImage(newImageData, filename, entityId, entityType);

    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'image:', error);
      throw new Error('Impossible de mettre à jour l\'image');
    }
  }

  /**
   * Supprime l'image associée à une entité
   * @param entityId ID de l'entité
   * @param entityType Type d'entité
   */
  async deleteEntityImage(entityId: number, entityType: 'chantier' | 'paie'): Promise<void> {
    try {
      const response = await fetch(`/api/images/entity/${entityType}/${entityId}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Erreur lors de la suppression: ${response.statusText}`);
      }

      // Nettoyer le cache
      this.clearCacheForEntity(entityId, entityType);

    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image:', error);
      throw new Error('Impossible de supprimer l\'image');
    }
  }

  /**
   * Récupère les images associées à une entité
   * @param entityId ID de l'entité
   * @param entityType Type d'entité
   * @param compressed Si true, retourne les versions compressées
   * @returns Promise avec les images
   */
  async getEntityImages(
    entityId: number,
    entityType: 'chantier' | 'paie',
    compressed: boolean = true
  ): Promise<string[]> {
    try {
      const response = await fetch(`/api/images/entity/${entityType}/${entityId}?compressed=${compressed}`);
      
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`Erreur lors de la récupération: ${response.statusText}`);
      }

      const images = await response.json();
      return compressed 
        ? images.map((img: any) => img.compressedData)
        : images.map((img: any) => img.fullQualityData);

    } catch (error) {
      console.error('Erreur lors de la récupération des images de l\'entité:', error);
      return [];
    }
  }

  /**
   * Ajoute une image au cache
   * @private
   */
  private addToCache(key: string, image: string): void {
    // Si le cache est plein, supprimer les plus anciennes entrées
    if (imageCache.size >= CACHE_CONFIG.maxSize) {
      const firstKey = imageCache.keys().next().value;
      if (firstKey) {
        imageCache.delete(firstKey);
      }
    }

    imageCache.set(key, image);

    // Programmer l'expiration
    setTimeout(() => {
      imageCache.delete(key);
    }, CACHE_CONFIG.ttl);
  }

  /**
   * Nettoie le cache pour une entité spécifique
   * @private
   */
  private clearCacheForEntity(entityId: number, entityType: string): void {
    const keysToDelete = Array.from(imageCache.keys()).filter(key => 
      key.includes(`${entityType}-${entityId}`)
    );
    
    keysToDelete.forEach(key => imageCache.delete(key));
  }

  /**
   * Vide tout le cache
   */
  clearCache(): void {
    imageCache.clear();
  }

  /**
   * Obtient les statistiques du cache
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: imageCache.size,
      maxSize: CACHE_CONFIG.maxSize
    };
  }
}

// Instance singleton du service
export const imageDatabaseService = new ImageDatabaseService();