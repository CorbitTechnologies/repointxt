import React, { useMemo, memo } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const OutputSection = ({ output, tokenCount, onCopy, onDownload, isMobile }) => {
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
    <View style={[styles.container, { backgroundColor: colors.card, borderRadius: isMobile ? borderRadius.lg : borderRadius.xl, padding: isMobile ? spacing.sm : spacing.md, ...shadows.lg }]}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={{ width: isMobile ? '100%' : 'auto' }}>
            <Text style={[styles.title, { color: colors.text, fontSize: isMobile ? 18 : 20 }]}>Bundle Output</Text>
            <View style={[styles.statsRow, { flexWrap: isMobile ? 'wrap' : 'nowrap' }]}>
              <View style={[styles.inlineStat, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{tokenCount.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>tokens</Text>
              </View>
              <View style={[styles.inlineStat, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statValue, { color: colors.secondary }]}>{output.length.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>chars</Text>
              </View>
            </View>
          </View>

          <View style={[styles.headerActions, { width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }]}>
            <TouchableOpacity
              style={[styles.primaryAction, { backgroundColor: colors.primary, borderRadius: borderRadius.md, ...shadows.sm }]}
              onPress={onCopy}
              activeOpacity={0.8}
            >
              <Text style={styles.actionTextMain}>📋 Copy All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAction, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.md }]}
              onPress={onDownload}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionTextSecondary, { color: colors.text }]}>⬇️ Download</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.outputWrapper, { backgroundColor: colors.darkBg || '#000', borderRadius: borderRadius.lg, borderColor: colors.border }]}>
        <ScrollView style={styles.outputBox} showsVerticalScrollIndicator={true}>
          <Text style={[styles.outputText, { color: '#E2E8F0', fontSize: isMobile ? 12 : 13 }]}>
            {output}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inlineStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextMain: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  actionTextSecondary: {
    fontSize: 13,
    fontWeight: '700',
  },
  outputWrapper: {
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  outputBox: {
    maxHeight: 600,
    padding: 12,
  },
  outputText: {
    fontSize: 13,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      web: 'JetBrains Mono, Fira Code, ui-monospace, monospace'
    }),
    lineHeight: 22,
  },
});

export default memo(OutputSection);