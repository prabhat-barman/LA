import React, { useEffect, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { MockSection, MockSession } from '../../MockTestRunner/types';
import { formatTimeAllowed } from '../helpers';
import { styles } from '../styles';

export interface WelcomeTableSlideProps {
  session: MockSession;
  onReadyChange: (ready: boolean) => void;
}

// PTE Academic groups Speaking + Writing into Part 1 (one continuous
// timer), Reading into Part 2, and Listening into Part 3. The table
// summarizes per-part time so the candidate knows how the test is
// structured before they begin.
interface WelcomePart {
  partLabel: string;
  contentLabel: string;
  durationSec: number;
}

const buildWelcomeParts = (session: MockSession): WelcomePart[] => {
  const get = (key: MockSection): number =>
    session.sectionDurationsSec[key] ?? 0;

  return [
    {
      partLabel: '1',
      contentLabel: 'Speaking & Writing',
      durationSec: get('Speaking') + get('Writing'),
    },
    {
      partLabel: '2',
      contentLabel: 'Reading',
      durationSec: get('Reading'),
    },
    {
      partLabel: '3',
      contentLabel: 'Listening',
      durationSec: get('Listening'),
    },
  ];
};

// Renders "—" when a section isn't represented in this mock — keeps
// the table visually honest rather than asserting "0 sec" which a
// candidate would (rightly) read as a bug.
const renderDuration = (sec: number): string => {
  if (sec <= 0) return '—';
  return formatTimeAllowed(sec);
};

const WelcomeTableSlide: React.FC<WelcomeTableSlideProps> = ({
  session,
  onReadyChange,
}) => {
  useEffect(() => {
    onReadyChange(true);
  }, [onReadyChange]);

  const parts = useMemo(() => buildWelcomeParts(session), [session]);

  return (
    <ScrollView
      style={styles.slide}
      contentContainerStyle={styles.slideContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.slideTitle}>Welcome</Text>
      <Text style={styles.slideDescription}>
        Here is a quick overview of the parts you will see in this test and
        the time allowed for each. Time runs continuously within each part.
      </Text>

      <View style={styles.welcomeTable}>
        <View style={[styles.welcomeRow, styles.welcomeRowHeader]}>
          <Text style={[styles.welcomeCellPart, styles.welcomeHeaderCell]}>
            Part
          </Text>
          <Text style={[styles.welcomeCellContent, styles.welcomeHeaderCell]}>
            Content
          </Text>
          <Text style={[styles.welcomeCellTime, styles.welcomeHeaderCell]}>
            Time
          </Text>
        </View>

        {parts.map((part, index) => (
          <View
            key={part.partLabel}
            style={[
              styles.welcomeRow,
              index === parts.length - 1 && styles.welcomeRowLast,
            ]}
          >
            <Text style={styles.welcomeCellPart}>{part.partLabel}</Text>
            <Text style={styles.welcomeCellContent}>{part.contentLabel}</Text>
            <Text style={styles.welcomeCellTime}>
              {renderDuration(part.durationSec)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default WelcomeTableSlide;
