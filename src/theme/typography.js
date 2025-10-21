import { StyleSheet } from 'react-native';
import Fonts from './fonts';

// Global typography styles that can be applied throughout the app
const Typography = StyleSheet.create({
  // Base text styles
  text: {
    fontFamily: Fonts.primary,
    fontSize: Fonts.sizes.regular,
    color: '#000',
  },

  // Headings
  h1: {
    fontFamily: Fonts.bold,
    fontSize: Fonts.sizes.massive,
    fontWeight: 'bold',
  },
  h2: {
    fontFamily: Fonts.bold,
    fontSize: Fonts.sizes.huge,
    fontWeight: 'bold',
  },
  h3: {
    fontFamily: Fonts.semiBold,
    fontSize: Fonts.sizes.xxlarge,
    fontWeight: '600',
  },
  h4: {
    fontFamily: Fonts.semiBold,
    fontSize: Fonts.sizes.xlarge,
    fontWeight: '600',
  },
  h5: {
    fontFamily: Fonts.semiBold,
    fontSize: Fonts.sizes.large,
    fontWeight: '600',
  },

  // Body text
  body: {
    fontFamily: Fonts.primary,
    fontSize: Fonts.sizes.regular,
  },
  bodyLarge: {
    fontFamily: Fonts.primary,
    fontSize: Fonts.sizes.medium,
  },
  bodySmall: {
    fontFamily: Fonts.regular,
    fontSize: Fonts.sizes.small,
  },

  // Special text styles
  caption: {
    fontFamily: Fonts.regular,
    fontSize: Fonts.sizes.small,
  },
  button: {
    fontFamily: Fonts.semiBold,
    fontSize: Fonts.sizes.medium,
    fontWeight: '600',
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: Fonts.sizes.regular,
    fontWeight: '600',
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: Fonts.sizes.medium,
  },

  // Weight variations
  light: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  regular: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  semiBold: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  bold: {
    fontFamily: Fonts.bold,
    fontWeight: 'bold',
  },
});

export default Typography;
