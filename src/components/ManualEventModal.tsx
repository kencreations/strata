import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Colors, Typography, Spacing } from '../theme';
import { useScheduleStore } from '../store/scheduleStore';
import { useVaultStore } from '../store/vaultStore';
import { useSettingsStore } from '../store/settingsStore';
import { insertEvent, updateEvent, getEventById } from '../db/repositories/eventRepository';
import { formatTime12Hour } from '../services/scheduleUtils';
import { scheduleEventNotification } from '../services/notificationService';
import type { Event } from '../db/types';

interface Props {
  visible: boolean;
  initialData?: Event;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const DAYS = [
  { label: 'Su', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
];

const getDynamicStart = () => {
  const now = new Date();
  return new Date(now.getTime() + 5 * 60000); // Now + 5 minutes
};

const getDynamicEnd = (start: Date) => {
  return new Date(start.getTime() + 2 * 60 * 60000); // Start + 2 hours
};

export const ManualEventModal: React.FC<Props> = ({ visible, initialData, onClose, onSaveSuccess }) => {
  const insets = useSafeAreaInsets();
  const { layers, refreshToday } = useScheduleStore();
  const { pickAndParse } = useVaultStore();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState<Date>(() => getDynamicStart());
  const [endTime, setEndTime] = useState<Date>(() => getDynamicEnd(getDynamicStart()));
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  
  const [isRecurring, setIsRecurring] = useState(true);
  const [specificDate, setSpecificDate] = useState(new Date());
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start'|'end'|null>(null);

  React.useEffect(() => {
    if (visible && initialData) {
      setTitle(initialData.title);
      setLocation(initialData.location || '');
      setStartTime(new Date(initialData.startTime));
      setEndTime(new Date(initialData.endTime));
      setSelectedLayerId(initialData.layerId);
      setIsRecurring(!!initialData.isRecurring);
      if (initialData.isRecurring) {
        setSelectedDays(JSON.parse(initialData.daysOfWeek || '[]'));
      } else {
        setSpecificDate(new Date(initialData.startTime));
        setSelectedDays([]);
      }
    } else if (visible && !initialData) {
      resetForm();
    }
  }, [visible, initialData]);

  const resetForm = () => {
    setTitle('');
    setLocation('');
    
    const dStart = getDynamicStart();
    setStartTime(dStart);
    
    const dEnd = getDynamicEnd(dStart);
    setEndTime(dEnd);
    
    setSelectedDays([]);
    setIsRecurring(true);
    setSpecificDate(new Date());
    if (layers.length > 0) setSelectedLayerId(layers[0].id);
  };

  const toggleDay = (val: number) => {
    if (selectedDays.includes(val)) {
      setSelectedDays(selectedDays.filter(d => d !== val));
    } else {
      setSelectedDays([...selectedDays, val]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Info', 'Please enter an event title.');
      return;
    }
    if (!selectedLayerId) {
      Alert.alert('Missing Info', 'Please select a layer.');
      return;
    }

    try {
      const startDate = new Date(isRecurring ? new Date() : specificDate);
      startDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

      const endDate = new Date(isRecurring ? new Date() : specificDate);
      endDate.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
      
      const eventPayload = {
        layerId: selectedLayerId,
        title: title.trim(),
        location: location.trim(),
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        daysOfWeek: isRecurring ? JSON.stringify(selectedDays) : '[]',
        isRecurring: isRecurring ? (1 as 1 | 0) : (0 as 1 | 0),
      };

      if (initialData) {
        await updateEvent(initialData.id, eventPayload);
        const updatedEvent = await getEventById(initialData.id);
        if (updatedEvent) {
          scheduleEventNotification(updatedEvent, useSettingsStore.getState().notificationOffset);
        }
      } else {
        const id = await insertEvent(eventPayload);
        const newEvent = await getEventById(id);
        if (newEvent) {
          scheduleEventNotification(newEvent, useSettingsStore.getState().notificationOffset);
        }
      }

      await refreshToday();
      resetForm();
      onSaveSuccess();
    } catch (e) {
      Alert.alert('Error', 'Failed to save event');
    }
  };

  const handlePickPDF = async () => {
    onClose();
    const result = await pickAndParse();
    if (result && result.length > 0) {
      // It will trigger navigation or show results in PlannerScreen because VaultStore updated
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.stackLg }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{initialData ? 'Edit Event' : 'Add Event'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            
            {!initialData && (
              <TouchableOpacity style={styles.pdfBtn} onPress={handlePickPDF} activeOpacity={0.85}>
                <Text style={styles.pdfBtnText}>🪄 Extract from PDF Schedule</Text>
              </TouchableOpacity>
            )}

            <View style={styles.segmentContainer}>
              <TouchableOpacity 
                style={[styles.segmentBtn, isRecurring && styles.segmentActive]}
                onPress={() => setIsRecurring(true)}
              >
                <Text style={[styles.segmentText, isRecurring && styles.segmentActiveText]}>Weekly Recurring</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segmentBtn, !isRecurring && styles.segmentActive]}
                onPress={() => setIsRecurring(false)}
              >
                <Text style={[styles.segmentText, !isRecurring && styles.segmentActiveText]}>Specific Date</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>ASSIGN LAYER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layerRow}>
              {layers.map(layer => {
                const isSelected = selectedLayerId === layer.id;
                return (
                  <TouchableOpacity
                    key={layer.id}
                    onPress={() => setSelectedLayerId(layer.id)}
                    style={[styles.layerChip, {
                      backgroundColor: isSelected ? `${layer.colorCode}26` : Colors.surfaceContainer,
                      borderColor: isSelected ? layer.colorCode : Colors.outlineVariant
                    }]}
                  >
                    <View style={[styles.layerDot, { backgroundColor: layer.colorCode }]} />
                    <Text style={[styles.layerText, { color: isSelected ? layer.colorCode : Colors.onSurfaceVariant }]}>
                      {layer.layerName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EVENT TITLE</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Physics 102"
                placeholderTextColor={Colors.onSurfaceVariant}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>LOCATION (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Room 402"
                placeholderTextColor={Colors.onSurfaceVariant}
              />
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeGroup}>
                <Text style={styles.label}>START TIME</Text>
                <TouchableOpacity 
                  style={styles.timeInputWrapper} 
                  onPress={() => {
                    setPickerTarget('start');
                    setShowTimePicker(true);
                  }}
                  activeOpacity={0.8}
                >
                   <Text style={styles.timeInputText}>
                     {formatTime12Hour(new Date(startTime).toISOString())}
                   </Text>
                   <MaterialIcons name="access-time" size={20} color={Colors.onSurfaceVariant} style={{ marginRight: 8 }} />
                </TouchableOpacity>
              </View>
              <View style={styles.timeGroup}>
                <Text style={styles.label}>END TIME</Text>
                <TouchableOpacity 
                  style={styles.timeInputWrapper} 
                  onPress={() => {
                    setPickerTarget('end');
                    setShowTimePicker(true);
                  }}
                  activeOpacity={0.8}
                >
                   <Text style={styles.timeInputText}>
                     {formatTime12Hour(new Date(endTime).toISOString())}
                   </Text>
                   <MaterialIcons name="access-time" size={20} color={Colors.onSurfaceVariant} style={{ marginRight: 8 }} />
                </TouchableOpacity>
              </View>
            </View>

            {!isRecurring ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>DATE</Text>
                <TouchableOpacity 
                  style={[styles.input, { height: 52, justifyContent: 'center' }]} 
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.timeInputText}>
                    {specificDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={specificDate}
                    mode="date"
                    display="default"
                    onValueChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setSpecificDate(date);
                    }}
                    onDismiss={() => setShowDatePicker(false)}
                  />
                )}
              </View>
            ) : (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>REPEATS ON</Text>
                <View style={styles.daysRow}>
                  {DAYS.map(day => {
                    const isSelected = selectedDays.includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.value}
                        onPress={() => toggleDay(day.value)}
                        style={[styles.dayPill, isSelected && styles.dayPillSelected]}
                      >
                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>{initialData ? 'Update Event' : 'Save Event'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showTimePicker && pickerTarget && (
        <DateTimePicker
          value={pickerTarget === 'start' ? startTime : endTime}
          mode="time"
          display="default"
          onValueChange={(event, date) => {
            setShowTimePicker(false);
            if (date) {
              if (pickerTarget === 'start') setStartTime(date);
              if (pickerTarget === 'end') setEndTime(date);
            }
          }}
          onDismiss={() => setShowTimePicker(false)}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.marginGlobal,
    paddingTop: Spacing.stackMd,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.stackMd,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 999,
    padding: 4,
    marginBottom: Spacing.stackLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${Colors.outlineVariant}50`,
  },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  segmentActive: { backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  segmentText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  segmentActiveText: { color: Colors.onPrimary },
  pdfBtn: {
    backgroundColor: `${Colors.tertiary}26`,
    borderColor: Colors.tertiary,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: Spacing.stackLg,
    alignItems: 'center',
  },
  pdfBtnText: {
    ...Typography.labelMd,
    color: Colors.tertiary,
    fontWeight: '700',
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface },
  closeBtn: { padding: 4 },
  scroll: {
    marginBottom: Spacing.stackMd,
  },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 1.2, marginBottom: 8 },
  fieldGroup: { marginBottom: Spacing.stackLg },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  layerRow: {
    gap: 8,
    marginBottom: Spacing.stackLg,
  },
  layerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    gap: 8,
  },
  layerDot: { width: 10, height: 10, borderRadius: 5 },
  layerText: { ...Typography.labelMd, fontWeight: '600' },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.stackMd,
    marginBottom: Spacing.stackLg,
  },
  timeGroup: { flex: 1 },
  timeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 48,
  },
  timeInputText: {
    flex: 1,
    paddingHorizontal: 8,
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  dayPillSelected: {
    backgroundColor: Colors.primary,
  },
  dayText: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
  },
  dayTextSelected: {
    color: Colors.onPrimary,
  },
  saveBtn: {
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: {
    ...Typography.headlineSm,
    color: Colors.onPrimary,
  },
});
