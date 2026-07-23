import { ImageType } from '../types';

type ImageCacheListener = (images: ImageType[]) => void;

const imageCache = new Map<number, ImageType>();
const listeners = new Set<ImageCacheListener>();

function emit() {
  const images = Array.from(imageCache.values());
  listeners.forEach(listener => listener(images));
}

export function getCachedImages(): ImageType[] {
  return Array.from(imageCache.values());
}

export function getCachedImageById(id: number): ImageType | undefined {
  return imageCache.get(id);
}

export function upsertCachedImage(image: ImageType): void {
  if (!image || typeof image.id !== 'number') {
    return;
  }

  imageCache.set(image.id, image);
  emit();
}

export function subscribeToImageCache(listener: ImageCacheListener): () => void {
  listeners.add(listener);
  listener(getCachedImages());

  return () => {
    listeners.delete(listener);
  };
}