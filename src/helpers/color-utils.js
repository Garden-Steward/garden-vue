/**
 * Generates a consistent color for an entity based on its identifier
 * Uses the same color palette as UserProfileDisplay component
 * 
 * @param {string|number} identifier - The identifier to generate a color for (name, ID, slug, etc.)
 * @returns {string} - A Tailwind color name (e.g., 'red', 'blue', 'emerald')
 */
export function getColorForIdentifier(identifier) {
  if (!identifier) return 'green'; // Default fallback
  
  // Convert identifier to string for hashing
  const str = String(identifier);
  
  // Available colors matching the safelist in tailwind.config.js
  const colors = [
    'red',
    'green',
    'blue',
    'orange',
    'purple',
    'fuchsia',
    'emerald',
    'violet',
    'indigo',
    'yellow',
    'lime',
    'slate'
  ];
  
  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Gets the color for a garden entity
 * Checks for existing color property first, then generates one based on identifier
 * 
 * @param {Object} garden - The garden object (may have color, title, slug, id)
 * @returns {string} - A Tailwind color name
 */
export function getGardenColor(garden) {
  if (!garden) return 'green';
  
  // If garden already has a color property, use it
  if (garden.color) return garden.color;
  
  // Try to get identifier from various possible locations
  const identifier = 
    garden.attributes?.slug ||
    garden.attributes?.title ||
    garden.slug ||
    garden.title ||
    garden.id ||
    garden.attributes?.id;
  
  return getColorForIdentifier(identifier);
}

/**
 * Gets the color for a volunteer/user entity
 * Checks for existing color property first, then generates one based on identifier
 * 
 * @param {Object} volunteer - The volunteer/user object (may have color, username, email, id)
 * @returns {string} - A Tailwind color name
 */
export function getVolunteerColor(volunteer) {
  if (!volunteer) return 'green';
  
  // If volunteer already has a color property, use it (same logic as UserProfileDisplay)
  if (volunteer.color) return volunteer.color;
  
  // Try to get identifier from various possible locations
  const identifier = 
    volunteer.username ||
    volunteer.email ||
    volunteer.attributes?.username ||
    volunteer.attributes?.email ||
    volunteer.id ||
    volunteer.attributes?.id;
  
  return getColorForIdentifier(identifier);
}


