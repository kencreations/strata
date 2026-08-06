import React from 'react';
import { View, StyleSheet } from 'react-native';

interface IntentStripProps {
  color: string;
}

/**
 * 4px vertical accent strip used on the left edge of task/file cards
 * to color-code the category (Academic=teal, Work=gold, Routine=green).
 */
export const IntentStrip: React.FC<IntentStripProps> = ({ color }) => {
  return <View style={[styles.strip, { backgroundColor: color }]} />;
};

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
});
