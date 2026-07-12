import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import type { MockResultUserInfo } from '../types';

interface Props {
  user: MockResultUserInfo | null | undefined;
  submittedAtIso: string | null;
}

interface InfoItem {
  label: string;
  value: string;
}

// Renders "-" for null / "null" / empty so the row looks intentional
// rather than blank. Mirrors legacy InfoRow's `displayValue` rule.
const displayValue = (val: string | null | undefined): string => {
  if (val == null) return '-';
  const trimmed = String(val).trim();
  if (trimmed.length === 0) return '-';
  if (trimmed.toLowerCase() === 'null') return '-';
  return trimmed;
};

const InfoRow: React.FC<InfoItem> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

// Best-effort short date — "Jun 3, 2026". Returns "-" for null /
// invalid input rather than letting `Invalid Date` leak through.
const formatDate = (iso: string | null): string => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '-';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
};

// Bottom section of the ScoreCard. Two stacked info cards
// (Candidate / Center) followed by the "Need a higher score?" dark
// CTA. Mirrors legacy CandidateCenterDetails.js but drops the
// footer logo + phone/website row (no contact-details API wired
// in the new stack yet — easy follow-up if needed).
export const CandidateCenterDetails: React.FC<Props> = ({
  user,
  submittedAtIso,
}) => {
  const dateLabel = formatDate(submittedAtIso);

  // Candidate Details — email-only on the new stack (matches what
  // legacy ScoreCardScreen actually pushes into `candidateInfo`
  // after the commented-out lines). Country fields stay on the
  // legacy CandidateInfoCard path; we can re-introduce them here
  // once the design asks for it.
  const candidateDetails: InfoItem[] = [
    { label: 'Email', value: displayValue(user?.email) },
  ];

  // Center Information — same hard-coded fields as legacy. Test
  // date / valid-until / issue-date all mirror the submission
  // timestamp because the backend doesn't ship separate dates.
  const centerDetails: InfoItem[] = [
    { label: 'Test Date', value: dateLabel },
    { label: 'Valid Until', value: dateLabel },
    { label: 'Report Issue Date', value: dateLabel },
    { label: 'Test Center ID', value: 'languageacademy' },
    { label: 'Test Center', value: 'online' },
  ];

  return (
    <View>
      <View style={styles.detailsCard}>
        <Text style={styles.detailsCardTitle}>Candidate Details</Text>
        <View style={styles.detailsDivider} />
        {candidateDetails.map((item, idx) => (
          <InfoRow
            key={`${item.label}-${idx}`}
            label={item.label}
            value={item.value}
          />
        ))}
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.detailsCardTitle}>Center Information</Text>
        <View style={styles.detailsDivider} />
        {centerDetails.map((item, idx) => (
          <InfoRow
            key={`${item.label}-${idx}`}
            label={item.label}
            value={item.value}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.upgradeCard}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Book a 1-on-1 session"
      >
        <Text style={styles.upgradeTitle}>Need a higher score?</Text>
        <Text style={styles.upgradeSubtitle}>
          Book a 1-on-1 session with our expert tutors to review the scorecard.
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default CandidateCenterDetails;
