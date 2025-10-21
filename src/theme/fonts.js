// Font configuration for the app
// Using Eina 02/03 as the primary font family

const Fonts = {
  // Font families
  primary: 'Eina-SemiBold',     // Default font (SemiBold)
  regular: 'Eina-Regular',      // Regular weight
  semiBold: 'Eina-SemiBold',    // Semi-bold weight
  bold: 'Eina-Bold',            // Bold weight
  light: 'Eina-Light',          // Light weight

  // Font sizes following best practices
  sizes: {
    tiny: 10,
    small: 12,
    regular: 14,
    medium: 16,
    large: 18,
    xlarge: 20,
    xxlarge: 24,
    huge: 28,
    massive: 32,
  },

  // Font weights (for fallback)
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    extraBold: '800',
  },
};

export default Fonts;
