import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SubHeader } from '../../components/molecules/SubHeader';
import { useToast } from '../../context/ToastContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import {
  DAILY_GOAL_SKILLS,
  type DailyGoalSkill,
  type DailyGoalTargets,
  SKILL_LABELS,
} from './types';
import { useDailyGoals } from './useDailyGoals';

const { width } = Dimensions.get('window');
const scale = (s: number) => (width / 375) * s;

const goalLabel = (n: number | null): string =>
  n == null || n === 0 ? 'Not set' : String(n);

const pct = (done: number, target: number | null): number => {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((done / target) * 100));
};

export const DailyGoalsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const { snapshot, loading, saving, error, reload, saveTargets, date } =
    useDailyGoals();

  // Local edit state — only mutated by the inputs at the bottom of
  // the screen. Initialised lazily from the loaded snapshot whenever
  // the user opens the editor.
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<DailyGoalTargets>>({});

  const openEditor = useCallback(() => {
    setDraft({ ...(snapshot?.targets ?? {}) });
    setEditorOpen(true);
  }, [snapshot]);

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setDraft({});
  }, []);

  const saveAndClose = useCallback(async () => {
    const ok = await saveTargets(draft);
    if (ok) {
      showToast('Daily goals saved!', 'success');
      closeEditor();
    } else {
      showToast('Could not save your goals.', 'error');
    }
  }, [draft, saveTargets, showToast, closeEditor]);

  const dateLabel = useMemo(() => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [date]);

  return (
    <View style={styles.container}>
      <SubHeader
        title="Daily Goals"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} />
        }
      >
        <Text style={styles.dateLabel}>{dateLabel}</Text>

        {loading && !snapshot ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <>
            {DAILY_GOAL_SKILLS.map(skill => {
              const target = snapshot?.targets[skill] ?? null;
              const done = (snapshot?.progress[`${skill}_done` as const] ?? 0);
              const ratio = pct(done, target);
              return (
                <GoalRow
                  key={skill}
                  label={SKILL_LABELS[skill]}
                  target={target}
                  done={done}
                  ratio={ratio}
                />
              );
            })}

            {snapshot?.tutorNotes && snapshot.tutorNotes.length > 0 && (
              <View style={styles.notesCard}>
                <Text style={styles.notesTitle}>Notes from your tutor</Text>
                {snapshot.tutorNotes.map((note, i) => (
                  <Text key={`${i}-${note.slice(0, 10)}`} style={styles.noteRow}>
                    {'\u2022'} {note}
                  </Text>
                ))}
              </View>
            )}

            {error && <Text style={styles.errorBanner}>{error}</Text>}

            <TouchableOpacity
              style={styles.editBtn}
              onPress={openEditor}
              activeOpacity={0.85}
            >
              <Text style={styles.editBtnLabel}>
                {snapshot?.targets &&
                Object.values(snapshot.targets).some(v => v != null && v > 0)
                  ? 'Update Today\u2019s Goals'
                  : 'Set Today\u2019s Goals'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {editorOpen && (
          <View style={styles.editorCard}>
            <Text style={styles.editorTitle}>Set targets</Text>
            {DAILY_GOAL_SKILLS.map(skill => (
              <View key={skill} style={styles.editorRow}>
                <Text style={styles.editorLabel}>{SKILL_LABELS[skill]}</Text>
                <TextInput
                  style={styles.editorInput}
                  value={String(draft[skill] ?? snapshot?.targets[skill] ?? '')}
                  onChangeText={t =>
                    setDraft(prev => ({
                      ...prev,
                      [skill]: t.trim() === '' ? null : Number(t.replace(/\D/g, '')) || 0,
                    }))
                  }
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  maxLength={3}
                />
              </View>
            ))}
            <View style={styles.editorButtons}>
              <TouchableOpacity
                style={[styles.editorBtn, styles.editorCancelBtn]}
                onPress={closeEditor}
                disabled={saving}
              >
                <Text style={styles.editorCancelLabel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editorBtn, styles.editorSaveBtn]}
                onPress={saveAndClose}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.editorSaveLabel}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default DailyGoalsScreen;

interface GoalRowProps {
  label: string;
  target: number | null;
  done: number;
  ratio: number;
}

const GoalRow: React.FC<GoalRowProps> = ({ label, target, done, ratio }) => (
  <View style={styles.goalRow}>
    <View style={styles.goalRowHeader}>
      <Text style={styles.goalLabel}>{label}</Text>
      <Text style={styles.goalCount}>
        {done} / {goalLabel(target)}
      </Text>
    </View>
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${ratio}%` as const },
          ratio >= 100 && styles.progressFillComplete,
        ]}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(40),
  },
  dateLabel: {
    fontSize: scale(14),
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: scale(12),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(80),
  },
  goalRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: scale(14),
    marginBottom: scale(10),
  },
  goalRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: scale(8),
  },
  goalLabel: {
    fontSize: scale(14),
    fontWeight: '700',
    color: '#1C1F2A',
  },
  goalCount: {
    fontSize: scale(13),
    color: '#48484A',
  },
  progressTrack: {
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#F2F3F5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: scale(3),
  },
  progressFillComplete: {
    backgroundColor: '#34C759',
  },
  notesCard: {
    marginTop: scale(8),
    padding: scale(14),
    borderRadius: scale(12),
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  notesTitle: {
    fontSize: scale(13),
    fontWeight: '700',
    color: '#92400E',
    marginBottom: scale(6),
  },
  noteRow: {
    fontSize: scale(13),
    color: '#78350F',
    lineHeight: scale(19),
  },
  errorBanner: {
    marginTop: scale(10),
    color: '#FF3B30',
    fontSize: scale(12),
    textAlign: 'center',
  },
  editBtn: {
    marginTop: scale(16),
    backgroundColor: '#007AFF',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  editBtnLabel: {
    color: '#FFFFFF',
    fontSize: scale(15),
    fontWeight: '700',
  },
  editorCard: {
    marginTop: scale(20),
    padding: scale(16),
    borderRadius: scale(12),
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editorTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: '#1C1F2A',
    marginBottom: scale(12),
  },
  editorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(10),
  },
  editorLabel: {
    fontSize: scale(13),
    color: '#1C1F2A',
    fontWeight: '600',
  },
  editorInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    width: scale(70),
    textAlign: 'center',
    fontSize: scale(14),
    color: '#1C1F2A',
  },
  editorButtons: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: scale(8),
  },
  editorBtn: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(10),
    alignItems: 'center',
  },
  editorCancelBtn: {
    backgroundColor: '#F2F3F5',
  },
  editorSaveBtn: {
    backgroundColor: '#007AFF',
  },
  editorCancelLabel: {
    color: '#48484A',
    fontWeight: '600',
  },
  editorSaveLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
