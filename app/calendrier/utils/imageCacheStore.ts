import { Image } from '../types';

type ImageCacheListener = (images: Image[]) => void;

const imageCache = new Map<number, Image>();
const listeners = new Set<ImageCacheListener>();

function emit() {
  const images = Array.from(imageCache.values());
  listeners.forEach(listener => listener(images));
}

export function getCachedImages(): Image[] {
  return Array.from(imageCache.values());
}

export function getCachedImageById(id: number): Image | undefined {
  return imageCache.get(id);
}

export function upsertCachedImage(image: Image): void {
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