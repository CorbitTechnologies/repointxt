import React, { useMemo, memo } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const OutputSection = ({ output, tokenCount, onCopy, onDownload, isMobile }) => {
  const { colors, borderRadius, spacing, shadows, isDark } = useTheme();

  if (!output) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, ...shadows.lg }]}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, marginBottom: isMobile ? 12 : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="copy" size={18} color={colors.text} />
              <Text style={[styles.title, { color: colors.text, fontSize: 18 }]}>Bundle Output</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={[styles.statValue, { color: colors.text }]}>{tokenCount.toLocaleString()} <Text style={styles.statLabel}>tokens</Text></Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.primaryAction, { backgroundColor: colors.primary, borderRadius: 8, ...shadows.sm }]}
              onPress={onCopy}
              activeOpacity={0.8}
            >
              <Icon name="copy" size={16} color={isDark ? '#000' : '#fff'} />
              <Text style={[styles.actionTextMain, { color: isDark ? '#000' : '#fff', marginLeft: 8 }]}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAction, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8 }]}
              onPress={onDownload}
              activeOpacity={0.8}
            >
              <Icon name="download" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.outputWrapper, { backgroundColor: colors.surface, borderRadius: 8, borderColor: colors.border }]}>
        <ScrollView style={styles.outputBox} showsVerticalScrollIndicator={true}>
          <Text style={[styles.outputText, { color: colors.text, fontSize: 12 }]}>
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
    gap: 12,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statsRow: {
    marginTop: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
    opacity: 0.6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryAction: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextMain: {
    fontSize: 13,
    fontWeight: '700',
  },
  outputWrapper: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  outputBox: {
    maxHeight: 400,
    padding: 16,
  },
  outputText: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      web: 'ui-monospace, monospace'
    }),
    lineHeight: 18,
  },
});

export default memo(OutputSection);