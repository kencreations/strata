import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../theme';

interface AppHeaderProps {
  title: string;
}

const AVATAR_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDZrTOWD5UKhoH9nwwzry1x08wKcr87K9FvJwo9LVL13gs-h6Q5ytm-VOy3sd_OnPgwPP1AX4tq9wVIcbPEvLiTeb-dBYunIo_K82oZDEePKu8Umm_HsoxsQbrrFITgd7N203zKOD-Agq_D8Cft_psb7rMCIEZTwoVrC65WODP1f0pH82ogJYuz5WqEagUlaH55Flb-HpratVH9CY4YO3pt6SuxkjH3H_qsBzhLHIoooPKPG3d0s6Ep';

export const AppHeader: React.FC<AppHeaderProps> = ({ title }) => {
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={80}
      tint="light"
      style={[styles.blur, { paddingTop: insets.top }]}
    >
      <View style={styles.inner}>
        {/* Left: logo dot + title */}
        <View style={styles.left}>
          <View style={styles.logoDot} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {/* Right: avatar */}
        <Image source={{ uri: AVATAR_URI }} style={styles.avatar} />
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  blur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  inner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginGlobal,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.stackSm,
  },
  logoDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryContainer,
  },
  title: {
    ...Typography.headlineSm,
    color: Colors.primary,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
