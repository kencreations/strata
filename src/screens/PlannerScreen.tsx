import React, { useEffect, useState, useMemo } from 'react';
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
import { useSettingsStore } from '../store/settingsStore';
import { insertEvent, clearEventsByLayer, deleteEvent, getEventById, getTotalEventCount } from '../db/repositories/eventRepository';
import type { ParsedCourseItem } from '../db/types';
import { scheduleEventNotification } from '../services/notificationService';
import { ManualEventModal } from '../components/ManualEventModal';
import { AddLayerModal } from '../components/AddLayerModal';
import { EventCard } from '../components/EventCard';
import { CustomAlertModal } from '../components/CustomAlertModal';
import type { Event } from '../db/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatTime12Hour } from '../services/scheduleUtils';

type ViewMode = 'Day' | 'Week' | 'Month';

export const PlannerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { layers, activeLayers, toggleLayer, refreshToday, allEvents, initialize } = useScheduleStore();
  const { parsedCourses, clearParsed } = useVaultStore();

  const [viewMode, setViewMode] = useState<ViewMode>('Day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [courses, setCourses] = useState<ParsedCourseItem[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isAddLayerModalVisible, setIsAddLayerModalVisible] = useState(false);
  
  const [clearLayerData, setClearLayerData] = useState<{ id: string, name: string } | null>(null);
  const [pickerTarget, setPickerTarget] = useState<{ id: string, type: 'start' | 'end', time: string } | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);
  // Batch layer assignment: null = auto-pick academic layer, otherwise user-chosen layer id
  const [batchLayerId, setBatchLayerId] = useState<string | null>(null);

  useEffect(() => {
    if (parsedCourses.length > 0) {
      setCourses(parsedCourses);
    }
  }, [parsedCourses]);

  // Ensure layers are loaded whenever the screen comes into focus.
  // This covers the case where the user navigates straight to the Planner
  // (e.g. after PDF parse) before DashboardScreen has called initialize().
  useEffect(() => {
    if (isFocused) {
      initialize();
    }
  }, [isFocused]);

  // Auto-select the Academic layer as the default batch category the
  // first time layers become available (batchLayerId still null).
  useEffect(() => {
    if (layers.length > 0 && batchLayerId === null) {
      const academic = layers.find(
        (l) => l.layerName.toLowerCase().includes('academic') ||
               l.layerName.toLowerCase().includes('university')
      );
      if (academic) {
        setBatchLayerId(academic.id);
      }
    }
  }, [layers]);

  const updateCourse = (id: string, field: keyof ParsedCourseItem, value: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const changeDate = (days: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(next);
  };

  const checkEventsForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().slice(0, 10);
    return allEvents.some((e) => {
      if (!activeLayers.includes(e.layerId)) return false;
      if (e.isRecurring) {
        const days = JSON.parse(e.daysOfWeek || '[]');
        return days.includes(dayOfWeek);
      }
      return e.startTime.startsWith(dateStr);
    });
  };

  const eventsForSelectedDate = useMemo(() => {
    const dayOfWeek = selectedDate.getDay();
    const dateStr = selectedDate.toISOString().slice(0, 10);
    
    return allEvents.filter((e) => {
      if (!activeLayers.includes(e.layerId)) return false;
      if (e.isRecurring) {
        const days = JSON.parse(e.daysOfWeek || '[]');
        return days.includes(dayOfWeek);
      }
      return e.startTime.startsWith(dateStr);
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allEvents, activeLayers, selectedDate]);

  const handleSaveToPlanner = async () => {
    if (courses.length === 0 || layers.length === 0) return;

    // Resolve which layer to save into
    const targetLayer = batchLayerId
      ? (layers.find(l => l.id === batchLayerId) ?? layers[0])
      : (layers.find(l => l.layerName.toLowerCase().includes('academic') || l.layerName.toLowerCase().includes('university')) ?? layers[0]);

    const doSave = async () => {
      try {
        await clearEventsByLayer(targetLayer.id);
        const today = new Date();

        const parseTimeStringLocal = (timeStr: string) => {
          const parts = timeStr.split(' ');
          if (parts.length < 2) return new Date(today);
          const [time, period] = parts;
          const [hourStr, minStr] = time.split(':');
          let hour = parseInt(hourStr || '10', 10);
          const min = parseInt(minStr || '0', 10);
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          const d = new Date(today);
          d.setHours(hour, min, 0, 0);
          return d;
        };

        for (const course of courses) {
          const startTime = parseTimeStringLocal(course.startTime);
          const endTime = parseTimeStringLocal(course.endTime);

          const id = await insertEvent({
            layerId: targetLayer.id,
            title: course.courseName,
            location: course.location,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            daysOfWeek: JSON.stringify(course.days),
            isRecurring: 1,
          });

          const savedEvent = await getEventById(id);
          if (savedEvent) {
            scheduleEventNotification(savedEvent, useSettingsStore.getState().notificationOffset);
          }
        }

        Alert.alert('Success', `${courses.length} events added to ${targetLayer.layerName}!`);
        clearParsed();
        setCourses([]);
        setBatchLayerId(null);
        await refreshToday();

        if (courses[0] && courses[0].days.length > 0) {
          const targetDay = courses[0].days[0];
          let nextDate = new Date();
          while (nextDate.getDay() !== targetDay) {
            nextDate.setDate(nextDate.getDate() + 1);
          }
          setSelectedDate(nextDate);
        }
        setViewMode('Day');
      } catch (e) {
        Alert.alert('Error', 'Failed to save events');
      }
    };

    // Smart overwrite guard: only warn if the target layer already has events
    const existingCount = await getTotalEventCount();
    if (existingCount === 0) {
      // First-time user — no warning needed
      doSave();
    } else {
      Alert.alert(
        'Overwrite Schedule?',
        `This will replace all events in "${targetLayer.layerName}". Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Overwrite', style: 'destructive', onPress: doSave },
        ]
      );
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteEvent(id);
      await refreshToday();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete event');
    }
  };

  const handleClearLayer = (layerId: string, layerName: string) => {
    setClearLayerData({ id: layerId, name: layerName });
  };

  const executeClearLayer = async () => {
    if (!clearLayerData) return;
    try {
      await clearEventsByLayer(clearLayerData.id);
      await refreshToday();
      setClearLayerData(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to clear layer');
    }
  };

  const renderDayView = () => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const headerText = isToday 
      ? "Today's Timeline" 
      : `${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} Timeline`;

    if (eventsForSelectedDate.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.timelineHeader}>{headerText}</Text>
          <MaterialIcons name="event-busy" size={48} color={Colors.outline} style={{ marginTop: 16 }} />
          <Text style={styles.emptyText}>No classes or events scheduled for this day.</Text>
        </View>
      );
    }

    return (
      <View style={styles.timeline}>
        <Text style={styles.timelineHeader}>{headerText}</Text>
        <View style={styles.timelineLine} />
        {eventsForSelectedDate.map(event => (
          <EventCard key={event.id} event={event} onDelete={handleDeleteEvent} onEdit={(e) => {
            setEditingEvent(e);
            setIsAddModalVisible(true);
          }} />
        ))}
      </View>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    
    const weekDays = [];
    for(let i=0; i<7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDays.push(d);
    }

    return (
      <View style={styles.weekContainer}>
        <View style={styles.weekStrip}>
          {weekDays.map((d, i) => {
            const isSelected = d.toDateString() === selectedDate.toDateString();
            const hasEvents = checkEventsForDate(d);
            return (
              <TouchableOpacity 
                key={i} 
                style={[styles.weekDayBtn, isSelected && styles.weekDaySelected]}
                onPress={() => setSelectedDate(d)}
              >
                <Text style={[styles.weekDayLabel, isSelected && styles.weekDaySelectedText]}>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}
                </Text>
                <Text style={[styles.weekDayNumber, isSelected && styles.weekDaySelectedText]}>
                  {d.getDate()}
                </Text>
                {hasEvents && <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />}
              </TouchableOpacity>
            );
          })}
        </View>
        {renderDayView()}
      </View>
    );
  };

  const renderMonthView = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const grid = [];
    let currentWeek = [];
    
    for(let i=0; i<firstDay; i++) {
      currentWeek.push(null);
    }
    
    for(let i=1; i<=daysInMonth; i++) {
      const d = new Date(year, month, i);
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        grid.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while(currentWeek.length < 7) currentWeek.push(null);
      grid.push(currentWeek);
    }

    return (
      <View style={styles.monthContainer}>
        <View style={styles.monthHeader}>
          {['S','M','T','W','T','F','S'].map((day, i) => (
             <Text key={i} style={styles.monthHeaderDay}>{day}</Text>
          ))}
        </View>
        {grid.map((week, wIdx) => (
          <View key={wIdx} style={styles.monthRow}>
            {week.map((d, dIdx) => {
              if (!d) return <View key={dIdx} style={styles.monthCell} />;
              const isSelected = d.toDateString() === selectedDate.toDateString();
              const hasEvents = checkEventsForDate(d);
              return (
                <TouchableOpacity 
                  key={dIdx} 
                  style={[styles.monthCell, isSelected && styles.monthCellSelected]}
                  onPress={() => setSelectedDate(d)}
                >
                  <Text style={[styles.monthCellText, isSelected && styles.monthCellSelectedText]}>
                    {d.getDate()}
                  </Text>
                  {hasEvents && <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View style={styles.monthDivider} />
        {renderDayView()}
      </View>
    );
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

        <View style={styles.dateHeader}>
          <TouchableOpacity onPress={() => changeDate(viewMode === 'Month' ? -30 : viewMode === 'Week' ? -7 : -1)} style={styles.dateArrow}>
            <MaterialIcons name="chevron-left" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          
          <View style={styles.dateHeaderCenter}>
            <Text style={styles.dateHeaderText}>
              {viewMode === 'Month' 
                ? selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            {(() => {
              const diffMs = new Date(selectedDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
              const diffDays = Math.round(diffMs / 86400000);
              if (diffDays === 0) return <Text style={styles.todayText}>Today</Text>;
              return (
                <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
                  <Text style={[styles.todayText, { color: Colors.onSurfaceVariant }]}>
                    {diffDays > 0 ? `In ${diffDays} days` : `${Math.abs(diffDays)} days ago`} • Tap for Today
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>

          <TouchableOpacity onPress={() => changeDate(viewMode === 'Month' ? 30 : viewMode === 'Week' ? 7 : 1)} style={styles.dateArrow}>
            <MaterialIcons name="chevron-right" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>

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
                onLongPress={() => handleClearLayer(layer.id, layer.layerName)}
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
          <TouchableOpacity 
            style={styles.addLayerChip}
            onPress={() => setIsAddLayerModalVisible(true)}
          >
            <MaterialIcons name="add" size={16} color={Colors.onSurfaceVariant} />
            <Text style={styles.addLayerText}>Add Layer</Text>
          </TouchableOpacity>
        </ScrollView>

        {courses.length > 0 && (
          <View style={styles.dataCard}>
            <View style={styles.accentStrip} />

            <View style={styles.dataCardHeader}>
              <MaterialIcons name="check-circle" size={20} color={Colors.tertiary} />
              <Text style={styles.dataCardTitle}>Data Extracted Successfully</Text>
            </View>

            {/* ── Batch Category Selector ── */}
            <View style={styles.batchSection}>
              <Text style={styles.fieldLabel}>ASSIGN SCHEDULE CATEGORY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.batchPillsRow}
              >
                {/* Auto pill — uses academic layer fallback */}
                <TouchableOpacity
                  style={[
                    styles.batchPill,
                    batchLayerId === null && styles.batchPillActive,
                  ]}
                  onPress={() => setBatchLayerId(null)}
                  activeOpacity={0.75}
                >
                  <MaterialIcons
                    name="auto-awesome"
                    size={14}
                    color={batchLayerId === null ? Colors.onPrimary : Colors.onSurfaceVariant}
                  />
                  <Text style={[
                    styles.batchPillText,
                    batchLayerId === null && styles.batchPillTextActive,
                  ]}>Auto</Text>
                </TouchableOpacity>

                {layers.map((layer) => {
                  const isSelected = batchLayerId === layer.id;
                  return (
                    <TouchableOpacity
                      key={layer.id}
                      style={[
                        styles.batchPill,
                        isSelected && { backgroundColor: layer.colorCode, borderColor: layer.colorCode },
                      ]}
                      onPress={() => setBatchLayerId(layer.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[
                        styles.batchPillDot,
                        { backgroundColor: isSelected ? Colors.onPrimary : layer.colorCode },
                      ]} />
                      <Text style={[
                        styles.batchPillText,
                        isSelected && styles.batchPillTextActive,
                      ]}>{layer.layerName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {courses.map((course, index) => (
              <View key={course.id} style={[styles.courseItem, index === courses.length - 1 && styles.lastCourseItem]}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>COURSE NAME</Text>
                  <TextInput
                    style={styles.input}
                    value={course.courseName}
                    onChangeText={(val) => updateCourse(course.id, 'courseName', val)}
                    placeholderTextColor={Colors.onSurfaceVariant}
                  />
                </View>
                <View style={styles.twoCol}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>START TIME</Text>
                    <TouchableOpacity 
                      style={styles.timeInputBtn}
                      onPress={() => {
                        setPickerTarget({ id: course.id, type: 'start', time: course.startTime });
                        setShowTimePicker(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.timeInputText}>{course.startTime}</Text>
                      <MaterialIcons name="access-time" size={16} color={Colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>END TIME</Text>
                    <TouchableOpacity 
                      style={styles.timeInputBtn}
                      onPress={() => {
                        setPickerTarget({ id: course.id, type: 'end', time: course.endTime });
                        setShowTimePicker(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.timeInputText}>{course.endTime}</Text>
                      <MaterialIcons name="access-time" size={16} color={Colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.fieldGroup, { marginTop: 4 }]}>
                  <Text style={styles.fieldLabel}>LOCATION</Text>
                  <TextInput
                    style={styles.input}
                    value={course.location}
                    onChangeText={(val) => updateCourse(course.id, 'location', val)}
                    placeholderTextColor={Colors.onSurfaceVariant}
                  />
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveToPlanner} activeOpacity={0.85}>
              <MaterialIcons name="save" size={20} color={Colors.onPrimary} />
              <Text style={styles.saveText}>Save All to Planner</Text>
            </TouchableOpacity>
          </View>
        )}

        {courses.length === 0 && (
          <View style={styles.viewContent}>
            {viewMode === 'Day' && renderDayView()}
            {viewMode === 'Week' && renderWeekView()}
            {viewMode === 'Month' && renderMonthView()}
          </View>
        )}

      </ScrollView>

      <ManualEventModal
        visible={isAddModalVisible}
        initialData={editingEvent}
        onClose={() => {
          setIsAddModalVisible(false);
          setEditingEvent(undefined);
        }}
        onSaveSuccess={() => {
          setIsAddModalVisible(false);
          setEditingEvent(undefined);
        }}
      />

      <AddLayerModal
        visible={isAddLayerModalVisible}
        onClose={() => setIsAddLayerModalVisible(false)}
      />

      <CustomAlertModal
        visible={!!clearLayerData}
        title="Clear Layer"
        message={`Are you sure you want to delete all events in ${clearLayerData?.name}? This cannot be undone.`}
        confirmText="Clear"
        onCancel={() => setClearLayerData(null)}
        onConfirm={executeClearLayer}
      />

      {showTimePicker && pickerTarget && (
        <DateTimePicker
          value={(() => {
            const today = new Date();
            const parts = pickerTarget.time.split(' ');
            if (parts.length < 2) return today;
            const [time, period] = parts;
            const [hourStr, minStr] = time.split(':');
            let hour = parseInt(hourStr || '10', 10);
            const min = parseInt(minStr || '0', 10);
            if (period === 'PM' && hour !== 12) hour += 12;
            if (period === 'AM' && hour === 12) hour = 0;
            today.setHours(hour, min, 0, 0);
            return today;
          })()}
          mode="time"
          display="default"
          onChange={(event, date) => {
            setShowTimePicker(false);
            if (date) {
              updateCourse(
                pickerTarget.id,
                pickerTarget.type === 'start' ? 'startTime' : 'endTime',
                formatTime12Hour(date.toISOString())
              );
            }
          }}
        />
      )}

      {/* FAB for Add Event */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: 90 + insets.bottom }]} 
        onPress={() => {
          setEditingEvent(undefined);
          setIsAddModalVisible(true);
        }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={28} color={Colors.onPrimary} />
      </TouchableOpacity>
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
  
  dateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  dateHeaderCenter: { alignItems: 'center', gap: 2 },
  dateHeaderText: { ...Typography.headlineSm, color: Colors.onSurface },
  todayText: { ...Typography.labelSm, color: Colors.primary },
  dateArrow: { padding: 4 },

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
  // Batch category selector
  batchSection: { gap: 6 },
  batchPillsRow: { gap: 8, paddingVertical: 4 },
  batchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  batchPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  batchPillDot: { width: 8, height: 8, borderRadius: 4 },
  batchPillText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  batchPillTextActive: { color: Colors.onPrimary },
  courseItem: { paddingBottom: Spacing.stackMd, marginBottom: Spacing.stackMd, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.outlineVariant, gap: Spacing.stackMd },
  lastCourseItem: { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 },
  fieldGroup: { gap: 4 },
  fieldLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 1.2 },
  input: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, ...Typography.bodyMd, color: Colors.onSurface },
  timeInputBtn: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 10, paddingHorizontal: 12, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeInputText: { ...Typography.bodyMd, color: Colors.onSurface },
  twoCol: { flexDirection: 'row', gap: Spacing.stackSm },
  saveButton: { height: 48, backgroundColor: Colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5 },
  saveText: { ...Typography.labelMd, color: Colors.onPrimary },

  viewContent: { flex: 1, minHeight: 400 },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 16 },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center' },

  timelineHeader: { ...Typography.headlineSm, color: Colors.onSurface, marginBottom: 24 },
  timeline: { paddingLeft: 12, marginTop: 8 },
  timelineLine: { position: 'absolute', top: 48, bottom: 24, left: 19, width: 2, backgroundColor: Colors.surfaceContainerHigh },

  weekContainer: { gap: 24 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  weekDayBtn: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 4 },
  weekDaySelected: { backgroundColor: Colors.primary },
  weekDayLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  weekDayNumber: { ...Typography.headlineSm, color: Colors.onSurface },
  weekDaySelectedText: { color: Colors.onPrimary },
  eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 2 },
  eventDotSelected: { backgroundColor: Colors.onPrimary },
  agendaTitle: { ...Typography.headlineSm, color: Colors.onSurface, paddingHorizontal: 8 },

  monthContainer: { gap: 16 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  monthHeaderDay: { width: 32, textAlign: 'center', ...Typography.labelSm, color: Colors.onSurfaceVariant },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  monthCell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  monthCellSelected: { backgroundColor: Colors.primary },
  monthCellText: { ...Typography.bodyMd, color: Colors.onSurface },
  monthCellSelectedText: { color: Colors.onPrimary, fontWeight: '600' },
  monthDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.outlineVariant, marginVertical: 8 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  }
});
