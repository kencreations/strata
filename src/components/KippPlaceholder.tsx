import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';

interface KippPlaceholderProps {
  size?: number;
  label?: string;
}

/**
 * Placeholder for the "Kipp" Aspin mascot Lottie animation.
 * Replace this View with a LottieView component when the Lottie JSON is ready.
 */
export const KippPlaceholder: React.FC<KippPlaceholderProps> = ({
  size = 64,
  label = 'KIPP LOTTIE ANIMATION HERE',
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* KIPP LOTTIE ANIMATION HERE */}
      <Text style={styles.paw}>🐾</Text>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryFixed,
    borderRadius: 999,
    padding: Spacing.stackSm,
  },
  paw: {
    fontSize: 24,
  },
  label: {
    ...Typography.labelSm,
    color: Colors.onPrimaryFixed,
    textAlign: 'center',
    marginTop: 2,
    display: 'none', // Hidden by default — visible in dev
  },
});
