/**
 * @fileoverview Utilitaires de gestion d'upload d'images
 * 
 * Fonctions pour :
 * - Validation des fichiers images
 * - Conversion en base64
 * - Gestion des erreurs d'upload
 * 
 * @module ImageUploadHandler
 * @author Gandara Solutions
 * @version 1.0.0
 */

/**
 * Types de fichiers autorisés
 */
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Taille maximale en bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Valide un fichier image
 */
const validateImageFile = (file: File): void => {
  // Vérifier le type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Type de fichier non autorisé. Types acceptés: ${ALLOWED_TYPES.join(', ')}`);
  }
  
  // Vérifier la taille
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
    throw new Error(`Fichier trop volumineux. Taille maximale: ${maxSizeMB}MB`);
  }
  
  // Vérifier le nom
  if (!file.name || file.name.trim() === '') {
    throw new Error('Nom de fichier invalide');
  }
};

/**
 * Convertit un fichier en data URL (base64)
 */
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        resolve(event.target.result);
      } else {
        reject(new Error('Erreur lors de la lecture du fichier'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Traite l'upload d'un fichier image
 */
export const handleImageUpload = async (file: File): Promise<string> => {
  try {
    // Valider le fichier
    validateImageFile(file);
    
    // Convertir en data URL
    const dataURL = await fileToDataURL(file);
    
    return dataURL;
  } catch (error) {
    // Re-lancer l'erreur avec un message plus spécifique
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Erreur inconnue lors de l\'upload');
    }
  }
};

/**
 * Valide une URL d'image
 */
export const validateImageURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:' || url.startsWith('data:image/');
  } catch {
    return url.startsWith('data:image/');
  }
};

/**
 * Obtient les informations d'un fichier image
 */
export const getImageInfo = (file: File): Promise<{
  width: number;
  height: number;
  size: number;
  type: string;
}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        size: file.size,
        type: file.type
      });
    };
    
    img.onerror = () => {
      reject(new Error('Impossible de charger l\'image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};