import React from 'react';
import { Image } from 'expo-image';

/**
 * Image with memory + disk cache. Signed URLs change every hour, so the cache key is the
 * URL without its query string (the storage path), and a photo is downloaded only once.
 */
export default function CachedImage({ uri, style, contentFit = 'cover', ...props }) {
  if (!uri) return null;
  return <Image source={{ uri, cacheKey: uri.split('?')[0] }} style={style} contentFit={contentFit} cachePolicy="memory-disk" transition={150} {...props} />;
}
