import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { Colors, Typography, Spacing } from '../theme';
import { useScheduleStore } from '../store/scheduleStore';
import { useVaultStore } from '../store/vaultStore';
import { insertEvent } from '../db/repositories/eventRepository';
import type { ParsedCourse } from '../db/types';

type ViewMode = 'Day' | 'Week' | 'Month';

export const PlannerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { layers, activeLayers, toggleLayer, refreshToday } = useScheduleStore();
  const { parsedCourses, clearParsed } = useVaultStore();

  const [viewMode, setViewMode] = useState<ViewMode>('Day');
  
  // Local state for extracted course (if any)
  const [courseName, setCourseName] = useState('');
  const [courseTime, setCourseTime] = useState('');
  const [courseLocation, setCourseLocation] = useState('');
  const [extractedCourse, setExtractedCourse] = useState<ParsedCourse | null>(null);

  useEffect(() => {
    if (parsedCourses.length > 0) {
      const course = parsedCourses[0];
      setExtractedCourse(course);
      setCourseName(course.courseName);
      setCourseTime(`${course.startTime} - ${course.endTime}`);
      setCourseLocation(course.location);
    }
  }, [parsedCourses]);

  const handleSaveToPlanner = async () => {
    if (!extractedCourse || layers.length === 0) return;
    try {
      const today = new Date();
      // Split mock time strings to real dates for today
      const startParts = extractedCourse.startTime.split(':');
      const endParts = extractedCourse.endTime.split(':');
      
      const startTime = new Date(today);
      startTime.setHours(parseInt(startParts[0] || '10'), parseInt(startParts[1] || '0'), 0, 0);
      
      const endTime = new Date(today);
      endTime.setHours(parseInt(endParts[0] || '11'), parseInt(endParts[1] || '30'), 0, 0);

      const layer = layers.find(l => l.layerName.toLowerCase().includes(extractedCourse.layerType)) || layers[0];

      await insertEvent({
        layerId: layer.id,
        title: courseName,
        location: courseLocation,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        daysOfWeek: JSON.stringify(extractedCourse.days),
        isRecurring: 1,
      });

      Alert.alert('Success', 'Event added to planner!');
      clearParsed();
      setExtractedCourse(null);
      refreshToday();
    } catch (e) {
      Alert.alert('Error', 'Failed to save event');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.stackMd, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Day / Week / Month Segmented Control */}
        <View style={styles.segmentContainer}>
          {(['Day', 'Week', 'Month'] as ViewMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.segmentBtn, viewMode === mode && styles.segmentActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.segmentText, viewMode === mode && styles.segmentActiveText]}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Layer Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {layers.map((layer) => {
            const isActive = activeLayers.includes(layer.id);
            return (
              <TouchableOpacity
                key={layer.id}
                onPress={() => toggleLayer(layer.id)}
                style={[styles.chip, { 
                  backgroundColor: isActive ? `${layer.colorCode}1A` : Colors.surfaceContainer,
                  borderColor: isActive ? `${layer.colorCode}33` : Colors.outlineVariant 
                }]}
              >
                <View style={[styles.chipDot, { backgroundColor: isActive ? layer.colorCode : Colors.outlineVariant }]} />
                <Text style={[styles.chipText, { color: isActive ? layer.colorCode : Colors.onSurfaceVariant }]}>
                  {layer.layerName}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.addLayerChip}>
            <MaterialIcons name="add" size={16} color={Colors.onSurfaceVariant} />
            <Text style={styles.addLayerText}>Add Layer</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Extracted Data Card */}
        {extractedCourse && (
          <View style={styles.dataCard}>
            <View style={styles.accentStrip} />

            <View style={styles.dataCardHeader}>
              <MaterialIcons name="check-circle" size={20} color={Colors.tertiary} />
              <Text style={styles.dataCardTitle}>Data Extracted Successfully</Text>
            </View>

            {/* Course Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>COURSE NAME</Text>
              <TextInput
                style={styles.input}
                value={courseName}
                onChangeText={setCourseName}
                placeholderTextColor={Colors.onSurfaceVariant}
              />
            </View>

            {/* Time + Location */}
            <View style={styles.twoCol}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>TIME</Text>
                <TextInput
                  style={styles.input}
                  value={courseTime}
                  onChangeText={setCourseTime}
                  placeholderTextColor={Colors.onSurfaceVariant}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>LOCATION</Text>
                <TextInput
                  style={styles.input}
                  value={courseLocation}
                  onChangeText={setCourseLocation}
                  placeholderTextColor={Colors.onSurfaceVariant}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveToPlanner} activeOpacity={0.85}>
              <MaterialIcons name="save" size={20} color={Colors.onPrimary} />
              <Text style={styles.saveText}>Save to Planner</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.marginGlobal, gap: Spacing.stackLg },
  segmentContainer: { flexDirection: 'row', backgroundColor: Colors.surfaceContainer, borderRadius: 999, padding: 4, alignSelf: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: `${Colors.outlineVariant}50` },
  segmentBtn: { paddingHorizontal: 24, paddingVertical: 6, borderRadius: 999 },
  segmentActive: { backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  segmentText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  segmentActiveText: { color: Colors.onPrimary },
  chipsRow: { gap: Spacing.stackSm, paddingVertical: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { ...Typography.labelMd },
  addLayerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.outline },
  addLayerText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  dataCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: Spacing.insetCard, paddingLeft: Spacing.insetCard + 8, gap: Spacing.stackMd, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  accentStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: Colors.primary, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  dataCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dataCardTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  fieldGroup: { gap: 4 },
  fieldLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 1.2 },
  input: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, ...Typography.bodyMd, color: Colors.onSurface },
  twoCol: { flexDirection: 'row', gap: Spacing.stackSm },
  saveButton: { height: 48, backgroundColor: Colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5 },
  saveText: { ...Typography.labelMd, color: Colors.onPrimary },
});
