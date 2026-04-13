import { useState, useEffect } from 'react';
import { imageService } from '../../../service';
import { getCachedImageById, upsertCachedImage } from '../../utils/imageCacheStore';

interface ImageProps {
  image: number | string;
  className?: string;
}

export function Image({ image, className }: ImageProps) {
  const toDataUrl = (value: string) => value.startsWith('data:') ? value : `data:image/jpeg;base64,${value}`;

  // 1. On prépare nos "boîtes" pour stocker le résultat
  const [imageSrc, setImageSrc] = useState<string | undefined>(typeof image === 'string' ? image : undefined);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 2. On lance l'appel API quand le composant s'affiche (ou quand l'ID change)
  useEffect(() => {
    setHasError(false);

    if (!image || typeof image === 'string') {
      setImageSrc(typeof image === 'string' ? image : undefined);
      setIsLoading(false);
      return;
    }

    const cachedImage = getCachedImageById(image as number);
    if (cachedImage?.image) {
      setImageSrc(toDataUrl(cachedImage.image));
      setIsLoading(false);
      return;
    }

    async function fetchImage() {
      try {
        // On appelle ton API
        const response = await imageService.getImage(image as number);
        const imageData = response.data;
        
        // ⚠️ ICI : L'assignation dépend de ce que renvoie exactement ton "getRequest"
        
        // Cas A : Ton getRequest renvoie le Base64 directement
        setImageSrc(toDataUrl(imageData));
        upsertCachedImage({
          id: image as number,
          image: imageData,
          name: `image-${image}`,
        });
        
        // Cas B : Ton getRequest renvoie l'URL magique (si c'est géré côté wrapper)
        // setImageSrc(response.url);

        // Cas C : Ton getRequest renvoie un Blob brut (comme on a vu plus tôt)
        // const urlBlob = URL.createObjectURL(response as any); // Adapte le typage
        // setImageSrc(urlBlob);

        

      } catch (error) {
        // S'il y a une erreur réseau ou une 404
        console.error("Impossible de charger l'image", error);
        setHasError(true);
      } finally {
        setIsLoading(false); // Fini de charger, en succès ou en erreur
      }
    }

    fetchImage();
  }, [image]);

  // 3. On gère l'affichage selon l'état
  
  if (isLoading) {
    // Tu peux mettre un petit spinner ou un carré gris ici
    return <div className="w-8 h-8 bg-gray-200 animate-pulse rounded-full flex-shrink-0" />;
  }

  if (hasError || !imageSrc) {
    // Image par défaut si ça plante ou s'il n'y a pas d'image
    return (
      <img
        src="/default-icon.png" 
        alt="Icône par défaut"
        className="w-8 h-8 object-cover flex-shrink-0 opacity-50"
      />
    );
  }

  // 4. Tout s'est bien passé, on affiche la vraie image !
  return (
    <img
      src={imageSrc}
      alt="Icône"
      className={className ? `${className}` : "w-8 h-8 object-cover flex-shrink-0"}
    />
  );
}