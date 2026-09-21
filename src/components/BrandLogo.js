import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function BrandLogo({ size = 'md', variant = 'light', showSubtitle = false, style }) {
  const isDark = variant === 'dark';
  const sizes = {
    sm: { badge: 40, icon: 20, text: 14 },
    md: { badge: 52, icon: 26, text: 16 },
    lg: { badge: 64, icon: 32, text: 20 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.badge,
          {
            width: s.badge,
            height: s.badge,
            borderRadius: s.badge / 2,
            backgroundColor: isDark ? '#F0EAD6' : 'rgba(255,255,255,0.15)',
            borderColor: isDark ? '#BCAAA4' : 'rgba(255,255,255,0.3)',
          },
        ]}
      >
        <MaterialCommunityIcons
          name="sprout"
          size={s.icon}
          color={isDark ? '#8B4513' : '#FFFFFF'}
        />
      </View>
      <Text style={[styles.title, { fontSize: s.text, color: isDark ? '#4A3423' : '#FFFFFF' }]}>
        FMIS
      </Text>
      {showSubtitle && (
        <Text style={[styles.subtitle, { color: isDark ? '#795548' : 'rgba(255,255,255,0.85)' }]}>
          Farm Management Information System
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  title: {
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 4,
  },
});
