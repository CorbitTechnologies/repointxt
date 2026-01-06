import React, { useMemo, memo } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const OutputSection = ({ output, tokenCount, onCopy, onDownload }) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();

  // Memoize expensive line count calculation
  const lineCount = useMemo(() => {
    if (!output) return 0;
    let count = 1;
    for (let i = 0; i < output.length; i++) {
      if (output[i] === '\n') count++;
    }
    return count;
  }, [output]);

  if (!output) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, ...shadows.md }]}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <Text style={[styles.title, { color: colors.text }]}>Results</Text>
          <View style={styles.statsRow}>
            <View style={[styles.inlineStat, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{tokenCount.toLocaleString()}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>tokens</Text>
            </View>
            <View style={[styles.inlineStat, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{output.length.toLocaleString()}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>chars</Text>
            </View>
            <View style={[styles.inlineStat, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{lineCount.toLocaleString()}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>lines</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.success, borderRadius: borderRadius.sm }]}
            onPress={onCopy}
          >
            <Text style={styles.headerButtonText}>📋 Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, styles.downloadButton, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.sm }]}
            onPress={onDownload}
          >
            <Text style={[styles.headerButtonTextSecondary, { color: colors.text }]}>⬇️ Download</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.outputWrapper, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderColor: colors.border }]}>
        <ScrollView style={styles.outputBox} showsVerticalScrollIndicator={true}>
          <Text style={[styles.outputText, { color: colors.text, opacity: 0.9 }]}>
            {output}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  downloadButton: {
    borderWidth: 1,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  headerButtonTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
    textTransform: 'lowercase',
  },
  outputWrapper: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  outputBox: {
    maxHeight: 500,
    padding: 16,
  },
  outputText: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }),
    lineHeight: 20,
  },
});

export default memo(OutputSection);