/**
 * Utilitaires pour la compression et gestion des images
 * Permet de sauvegarder en qualité complète et servir en version compressée
 */

/**
 * Interface pour les données d'image avec différentes qualités
 */
export interface ImageData {
  /** Version originale complète pour la BDD */
  fullQuality: string;
  /** Version compressée pour l'affichage */
  compressed: string;
  /** Métadonnées */
  metadata: {
    originalSize: number;
    compressedSize: number;
    width: number;
    height: number;
    format: string;
  };
}

/**
 * Configuration de compression
 */
export interface CompressionConfig {
  /** Qualité JPEG (0.1 à 1.0) */
  quality: number;
  /** Largeur maximale pour l'affichage */
  maxDisplayWidth: number;
  /** Hauteur maximale pour l'affichage */
  maxDisplayHeight: number;
  /** Largeur maximale pour la sauvegarde complète */
  maxSaveWidth: number;
  /** Hauteur maximale pour la sauvegarde complète */
  maxSaveHeight: number;
}

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG: CompressionConfig = {
  quality: 0.8,
  maxDisplayWidth: 200,
  maxDisplayHeight: 200,
  maxSaveWidth: 1920,
  maxSaveHeight: 1920
};

/**
 * Redimensionne une image en gardant les proportions
 * @param canvas Canvas contenant l'image
 * @param ctx Contexte 2D du canvas
 * @param img Image source
 * @param maxWidth Largeur maximum
 * @param maxHeight Hauteur maximum
 * @returns Dimensions finales
 */
function resizeImage(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = img;
  
  // Calculer les nouvelles dimensions en gardant le ratio
  if (width > height) {
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
  }
  
  // Redimensionner le canvas
  canvas.width = width;
  canvas.height = height;
  
  // Dessiner l'image redimensionnée
  ctx.drawImage(img, 0, 0, width, height);
  
  return { width, height };
}

/**
 * Traite un fichier image pour créer les versions complète et compressée
 * @param file Fichier image source
 * @param config Configuration de compression (optionnelle)
 * @returns Promise contenant les données d'image traitées
 */
export async function processImageFile(
  file: File,
  config: Partial<CompressionConfig> = {}
): Promise<ImageData> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Impossible de créer le contexte canvas'));
      return;
    }
    
    img.onload = () => {
      try {
        // Vérifier les dimensions originales
        const { width: originalWidth, height: originalHeight } = img;
        
        // === VERSION COMPLÈTE POUR LA BDD ===
        const fullQualityDimensions = resizeImage(
          canvas, ctx, img,
          finalConfig.maxSaveWidth,
          finalConfig.maxSaveHeight
        );
        
        const fullQualityDataURL = canvas.toDataURL('image/jpeg', 0.95); // Haute qualité
        
        // === VERSION COMPRESSÉE POUR L'AFFICHAGE ===
        const compressedDimensions = resizeImage(
          canvas, ctx, img,
          finalConfig.maxDisplayWidth,
          finalConfig.maxDisplayHeight
        );
        
        const compressedDataURL = canvas.toDataURL('image/jpeg', finalConfig.quality);
        
        // Calculer les tailles
        const originalSize = file.size;
        const compressedSize = Math.round(compressedDataURL.length * 0.75); // Approximation
        
        const result: ImageData = {
          fullQuality: fullQualityDataURL,
          compressed: compressedDataURL,
          metadata: {
            originalSize,
            compressedSize,
            width: originalWidth,
            height: originalHeight,
            format: file.type
          }
        };
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Impossible de charger l\'image'));
    };
    
    // Charger le fichier
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresse une image existante (DataURL)
 * @param imageDataURL Image source en DataURL
 * @param config Configuration de compression
 * @returns Promise contenant l'image compressée
 */
export async function compressExistingImage(
  imageDataURL: string,
  config: Partial<CompressionConfig> = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Impossible de créer le contexte canvas'));
      return;
    }
    
    img.onload = () => {
      try {
        resizeImage(
          canvas, ctx, img,
          finalConfig.maxDisplayWidth,
          finalConfig.maxDisplayHeight
        );
        
        const compressedDataURL = canvas.toDataURL('image/jpeg', finalConfig.quality);
        resolve(compressedDataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Impossible de charger l\'image'));
    };
    
    img.src = imageDataURL;
  });
}

/**
 * Convertit un fichier en DataURL pour la sauvegarde complète
 * @param file Fichier source
 * @param maxWidth Largeur maximum (optionnelle)
 * @param maxHeight Hauteur maximum (optionnelle)
 * @returns Promise contenant le DataURL
 */
export async function fileToFullQualityDataURL(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB max
      reject(new Error('Le fichier est trop volumineux. Taille maximum : 5 MB'));
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      reject(new Error('Format non supporté. Formats acceptés : JPG, PNG, GIF, WebP'));
      return;
    }
    
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Impossible de créer le contexte canvas'));
      return;
    }
    
    img.onload = () => {
      try {
        resizeImage(canvas, ctx, img, maxWidth, maxHeight);
        const dataURL = canvas.toDataURL('image/jpeg', 0.95);
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Impossible de charger l\'image'));
    };
    
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Obtient la taille d'un DataURL en bytes
 * @param dataURL DataURL à mesurer
 * @returns Taille en bytes
 */
export function getDataURLSize(dataURL: string): number {
  const base64String = dataURL.split(',')[1];
  return Math.round((base64String.length * 3) / 4);
}

/**
 * Valide les dimensions et la taille d'une image
 * @param file Fichier à valider
 * @param maxSize Taille maximum en bytes
 * @param maxWidth Largeur maximum
 * @param maxHeight Hauteur maximum
 * @returns Promise de validation
 */
export async function validateImageFile(
  file: File,
  maxSize: number = 5 * 1024 * 1024,
  maxWidth: number = 2048,
  maxHeight: number = 2048
): Promise<boolean> {
  if (file.size > maxSize) {
    throw new Error(`Le fichier est trop volumineux. Taille maximum : ${Math.round(maxSize / 1024 / 1024)} MB`);
  }
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Format non supporté. Formats acceptés : JPG, PNG, GIF, WebP');
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      if (img.width > maxWidth || img.height > maxHeight) {
        reject(new Error(`Image trop grande. Dimensions maximum : ${maxWidth}x${maxHeight}px`));
      } else {
        resolve(true);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Impossible de charger l\'image'));
    };
    
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}