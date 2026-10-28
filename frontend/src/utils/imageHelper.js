/**
 * Helper to ensure item photos (Base64 strings or URLs) are correctly formatted for <img> src
 */
export const formatPhotoUrl = (photo) => {
  if (!photo || typeof photo !== 'string') {
    return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
  }

  const trimmed = photo.trim();

  // Already a full data URI (e.g., data:image/png;base64,...)
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Already an external web URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Raw Base64 string from MongoDB without data prefix
  return `data:image/jpeg;base64,${trimmed}`;
};
