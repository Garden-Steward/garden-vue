/**
 * Default garden images to use when no specific image is available
 */
const DEFAULT_GARDEN_IMAGES = [
  "https://storage.googleapis.com/steward_upload/uploads/20240818_101336_dd55c7a910/20240818_101336_dd55c7a910.jpg",
  "https://storage.googleapis.com/steward_upload/uploads/garden_volunteers_feb24_2c9697c88b/garden_volunteers_feb24_2c9697c88b.jpg",
  "https://storage.googleapis.com/steward_upload/uploads/Screenshot_2024_08_20_at_7_23_46_AM_82aa7ed2a6/Screenshot_2024_08_20_at_7_23_46_AM_82aa7ed2a6.png"
];

/**
 * Get a random default garden image
 * @returns {string} URL of a random default garden image
 */
export function getRandomDefaultImage() {
  return DEFAULT_GARDEN_IMAGES[Math.floor(Math.random() * DEFAULT_GARDEN_IMAGES.length)];
}

/**
 * Get a default image or use the provided one
 * @param {string|null|undefined} providedImage - The image URL provided (if any)
 * @returns {string} The provided image or a random default image
 */
export function getImageOrDefault(providedImage) {
  return providedImage || getRandomDefaultImage();
}

export default {
  getRandomDefaultImage,
  getImageOrDefault,
  DEFAULT_GARDEN_IMAGES
};

