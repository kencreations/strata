import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';

import { KippPlaceholder } from '../components/KippPlaceholder';
import { Colors, Typography, Spacing } from '../theme';
import { useVaultStore } from '../store/vaultStore';
import { useAuthStore } from '../store/authStore';

type FilterType = 'All Files' | 'Documents' | 'Images' | 'Audio';
const FILTERS: FilterType[] = ['All Files', 'Documents', 'Images', 'Audio'];

export const VaultScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { user } = useAuthStore();
  
  const { 
    documents, 
    loadDocuments, 
    pickAndParse, 
    generateStudySet, 
    isProcessing, 
    processingStatus,
    parsedCourses,
    removeDocument,
    clearAll 
  } = useVaultStore();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All Files');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (isFocused && user) loadDocuments(user.id);
  }, [isFocused, user]);

  // Auto-cleanup legacy sched.pdf from Vault
  useEffect(() => {
    if (documents.length > 0) {
      documents.forEach((doc) => {
        if (doc.fileName.toLowerCase().includes('sched.pdf')) {
          removeDocument(doc.id);
        }
      });
    }
  }, [documents, removeDocument]);

  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents]);

  const handleUpload = async () => {
    const courses = await pickAndParse();
    if (courses && courses.length > 0) {
      navigation.navigate('Planner');
    }
  };

  const handleGenerate = async () => {
    if (!selectedDocId) return;
    const count = await generateStudySet(selectedDocId);
    if (count > 0) {
      Alert.alert('Success', `Generated ${count} flashcards from document!`);
      navigation.navigate('Study');
    }
  };

  const getFileIcon = (mime: string) => {
    if (mime.includes('image')) return 'image';
    if (mime.includes('pdf')) return 'picture-as-pdf';
    return 'description';
  };

  const getFileColor = (idx: number) => {
    const colors = [Colors.primary, Colors.secondary, Colors.tertiary];
    return colors[idx % colors.length];
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
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color={Colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search the vault..."
            placeholderTextColor={Colors.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
          />
          <MaterialIcons name="mic" size={22} color={Colors.onSurfaceVariant} />
        </View>

        {/* Filter Chips & Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity key={f} style={[styles.filterChip, activeFilter === f && styles.filterChipActive]} onPress={() => setActiveFilter(f)}>
                <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => clearAll()}>
              <MaterialIcons name="delete-sweep" size={20} color={Colors.error} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primaryContainer }]} onPress={handleUpload}>
              <MaterialIcons name="file-upload" size={20} color={Colors.onPrimaryContainer} />
            </TouchableOpacity>
          </View>
        </View>

        {/* File List */}
        <View style={styles.fileList}>
          {documents.map((file, idx) => {
            const color = getFileColor(idx);
            const isSelected = file.id === selectedDocId;
            return (
              <TouchableOpacity 
                key={file.id} 
                style={[styles.fileCard, isSelected && { borderColor: Colors.primary, borderWidth: 1 }]} 
                onPress={() => setSelectedDocId(file.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.fileStrip, { backgroundColor: color }]} />
                <View style={styles.fileRow}>
                  <View style={[styles.fileIconBg, { backgroundColor: `${color}1A` }]}>
                    <MaterialIcons name={getFileIcon(file.fileType)} size={22} color={color} />
                  </View>
                  <View style={styles.fileMeta}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.fileName}</Text>
                    <Text style={styles.fileSub}>{new Date(file.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeDocument(file.id)} style={{ padding: 4 }}>
                    <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                  {isSelected && <MaterialIcons name="check-circle" size={20} color={Colors.primary} style={{ marginLeft: 4 }} />}
                </View>
              </TouchableOpacity>
            );
          })}
          
          {documents.length === 0 && (
            <View style={{ alignItems: 'center', padding: 40, opacity: 0.5 }}>
              <MaterialIcons name="folder-open" size={48} color={Colors.onSurfaceVariant} />
              <Text style={{ ...Typography.bodyLg, marginTop: 12 }}>Vault is empty</Text>
            </View>
          )}
        </View>

        {/* AI Study Engine Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiBlob1} />
          <View style={styles.aiBlob2} />

          <View style={styles.aiCardHeader}>
            <View style={styles.aiCardLeft}>
              <MaterialIcons name="auto-awesome" size={22} color={Colors.primary} />
              <Text style={styles.aiCardTitle}>AI Study Engine</Text>
            </View>
            <View style={styles.aiReadyBadge}>
              <View style={styles.aiReadyDot} />
              <Text style={styles.aiReadyText}>Local AI Ready</Text>
            </View>
          </View>

          <Text style={styles.aiBody}>Generate flashcards, practice questions, and a summary from:</Text>
          <View style={styles.selectedFile}>
            <MaterialIcons name="description" size={18} color={Colors.primary} />
            <Text style={styles.selectedFileName} numberOfLines={1}>
              {documents.find(d => d.id === selectedDocId)?.fileName || 'Select a document above'}
            </Text>
          </View>

          <View style={styles.generateRow}>
            {isProcessing ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 52 }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={{ ...Typography.labelMd, color: Colors.primary }}>{processingStatus}</Text>
              </View>
            ) : (
              <>
                <KippPlaceholder size={44} />
                <TouchableOpacity 
                  style={[styles.generateButton, !selectedDocId && { opacity: 0.5 }]} 
                  disabled={!selectedDocId}
                  onPress={handleGenerate} 
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="generating-tokens" size={20} color={Colors.onPrimary} />
                  <Text style={styles.generateText}>Generate Study Set</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.marginGlobal, gap: Spacing.stackMd },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: Colors.surfaceContainerLow, borderRadius: 16, paddingHorizontal: Spacing.stackMd, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, ...Typography.bodyMd, color: Colors.onSurface, padding: 0 },
  filtersRow: { gap: Spacing.stackSm, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.surfaceContainerLow },
  filterChipActive: { backgroundColor: Colors.onSurface },
  filterText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  filterTextActive: { color: Colors.surface },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  fileList: { gap: Spacing.stackSm },
  fileCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14, paddingLeft: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  fileStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIconBg: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fileMeta: { flex: 1, minWidth: 0 },
  fileName: { ...Typography.labelMd, color: Colors.onSurface, fontWeight: '600' },
  fileSub: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: 2 },
  aiCard: { backgroundColor: Colors.surfaceContainerHighest, borderRadius: 20, padding: Spacing.insetCard, gap: Spacing.stackMd, overflow: 'hidden', marginBottom: Spacing.stackSm, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  aiBlob1: { position: 'absolute', top: 0, right: 0, width: 100, height: 100, borderBottomLeftRadius: 999, backgroundColor: `${Colors.primary}0D` },
  aiBlob2: { position: 'absolute', bottom: 0, left: 0, width: 80, height: 80, borderTopRightRadius: 999, backgroundColor: `${Colors.tertiary}0D` },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiCardTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  aiReadyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${Colors.tertiary}26`, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  aiReadyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.tertiary },
  aiReadyText: { ...Typography.labelSm, color: Colors.tertiaryFixedDim },
  aiBody: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  selectedFile: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceContainer, padding: 10, borderRadius: 10 },
  selectedFileName: { ...Typography.labelMd, color: Colors.onSurface, flex: 1 },
  generateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.stackSm },
  generateButton: { flex: 1, height: 52, backgroundColor: Colors.primary, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  generateText: { ...Typography.labelMd, color: Colors.onPrimary },
});
