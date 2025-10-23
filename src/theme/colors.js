
const CoffeeColors = {
  // Coffee-themed brown color palette (All shades of #8B4513)
  VERY_DARK_BROWN: '#3E2723',      // Darkest shade - shadows, dark elements
  DARK_BROWN: '#6B3410',           // Dark brown - headers, primary buttons
  MEDIUM_BROWN: '#8B4513',         // Primary brown - main accent
  PRIMARY_BROWN: '#8B4513',        // Alias for MEDIUM_BROWN - primary color
  LIGHT_BROWN: '#A0522D',          // Light brown - lighter accents
  VERY_LIGHT_BROWN: '#D2B48C',     // Very light brown - light backgrounds
  CREAM: '#F5DEB3',                // Cream/beige - text highlights, light elements

  // Neutrals (grayscale alternatives - use sparingly, prefer brown for everything)
  WHITE: '#ffffff',
  LIGHT_GRAY: '#f5f5f5',           // Screen background (can use white/cream instead)
  GRAY_TEXT: '#757575',            // Secondary text (prefer MEDIUM_BROWN instead)

  // All status colors now use brown shades instead of red/green
  // This ensures consistent brown branding throughout
  ACCENT: '#8B4513',               // Primary accent - changed from red to brown
  ERROR_RED: '#6B3410',            // Error messages - now dark brown
  SUCCESS_GREEN: '#8B4513',        // Success messages - now medium brown
  GREEN: '#8B4513',                // Alias to MEDIUM_BROWN for consistency
};

export default CoffeeColors;
