import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Typography, Spacing } from '../theme';
import { useScheduleStore } from '../store/scheduleStore';
import { insertScheduleLayer } from '../db/repositories/eventRepository';
import { GUEST_USER_ID } from '../db/migrations';
import { useAuthStore } from '../store/authStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const LAYER_COLORS = [
  { label: 'Teal', value: '#006D77' }, // Colors.primary
  { label: 'Gold', value: '#FFB703' }, // Colors.tertiary
  { label: 'Green', value: '#2A9D8F' }, // Colors.secondary
  { label: 'Coral', value: '#E76F51' },
  { label: 'Indigo', value: '#3F37C9' },
];

export const AddLayerModal: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { initialize } = useScheduleStore();
  const { user } = useAuthStore();

  const [layerName, setLayerName] = useState('');
  const [colorCode, setColorCode] = useState(LAYER_COLORS[0].value);

  const resetForm = () => {
    setLayerName('');
    setColorCode(LAYER_COLORS[0].value);
  };

  const handleSave = async () => {
    if (!layerName.trim()) {
      Alert.alert('Missing Info', 'Please enter a layer name.');
      return;
    }

    try {
      const userId = user?.id || GUEST_USER_ID;
      await insertScheduleLayer(userId, layerName.trim(), colorCode);
      
      await initialize(userId);
      resetForm();
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Failed to create layer');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.stackLg }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Custom Layer</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>LAYER NAME</Text>
            <TextInput
              style={styles.input}
              value={layerName}
              onChangeText={setLayerName}
              placeholder="e.g. Clubs & Hobbies"
              placeholderTextColor={Colors.onSurfaceVariant}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>COLOR</Text>
            <View style={styles.colorRow}>
              {LAYER_COLORS.map(c => {
                const isSelected = colorCode === c.value;
                return (
                  <TouchableOpacity
                    key={c.value}
                    onPress={() => setColorCode(c.value)}
                    style={[styles.colorCircle, { backgroundColor: c.value }, isSelected && styles.colorSelected]}
                  >
                    {isSelected && <MaterialIcons name="check" size={20} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Create Layer</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.stackLg,
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface },
  closeBtn: { padding: 4 },
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
  colorRow: { flexDirection: 'row', gap: 16 },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 2,
    borderColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveBtn: {
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.stackMd,
  },
  saveBtnText: { ...Typography.headlineSm, color: Colors.onPrimary },
});
