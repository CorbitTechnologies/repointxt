import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';
import Checkbox from './Checkbox';
import BubbleInput from './BubbleInput';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ProcessingOptions = ({
  removeComments,
  setRemoveComments,
  removeExtraWhitespace,
  setRemoveExtraWhitespace,
  includeOnlyCode,
  setIncludeOnlyCode,
  maxFileSize,
  setMaxFileSize,
  ignorePatterns,
  setIgnorePatterns,
  tokenOptimizationLevel,
  setTokenOptimizationLevel,
  respectGitignore,
  setRespectGitignore,
  isMobile
}) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed(!isCollapsed);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleCollapse}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Icon name="settings" size={14} color={colors.textSecondary} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginLeft: 8 }]}>
            Configuration & Filters
          </Text>
        </View>
        <View style={!isCollapsed && { transform: [{ rotate: '180deg' }] }}>
          <Icon name="chevron-down" size={14} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={styles.content}>
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Token Density Level</Text>
            <View style={[styles.densityRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: 4, borderWidth: 1, borderColor: colors.border, flexDirection: isMobile ? 'column' : 'row' }]}>
              {[
                { label: 'Standard', value: 0 },
                { label: 'Compact', value: 1 },
                { label: 'Minimal', value: 2 }
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.densityOption,
                    tokenOptimizationLevel === opt.value && {
                      backgroundColor: colors.card,
                      borderRadius: borderRadius.sm,
                      ...shadows.sm
                    }
                  ]}
                  onPress={() => setTokenOptimizationLevel(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.densityText,
                    {
                      color: tokenOptimizationLevel === opt.value ? colors.text : colors.textSecondary,
                      fontWeight: tokenOptimizationLevel === opt.value ? '700' : '500'
                    }
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.optionsGrid}>
            <View style={styles.checkboxGroup}>
              <Checkbox
                label="Strip Comments"
                checked={removeComments}
                onPress={() => setRemoveComments(!removeComments)}
              />
              <Checkbox
                label="Minify Whitespace"
                checked={removeExtraWhitespace}
                onPress={() => setRemoveExtraWhitespace(!removeExtraWhitespace)}
              />
            </View>

            <View style={styles.checkboxGroup}>
              <Checkbox
                label="Respect .gitignore"
                checked={respectGitignore}
                onPress={() => setRespectGitignore(!respectGitignore)}
              />
              <Checkbox
                label="Code Files Only"
                checked={includeOnlyCode}
                onPress={() => setIncludeOnlyCode(!includeOnlyCode)}
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border, opacity: 0.5 }]} />

          <View style={[styles.footerInputs, { flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start' }]}>
            <View style={{ flex: 1, marginBottom: isMobile ? 12 : 0 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Ignore Patterns</Text>
              <BubbleInput
                patterns={ignorePatterns}
                setPatterns={setIgnorePatterns}
                placeholder="node_modules, .git..."
              />
            </View>
            <View style={{ width: isMobile ? '100%' : 100 }}>
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 6 }]}>Max Size</Text>
              <View style={[styles.fileSizeRow, {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.md,
                paddingHorizontal: spacing.sm,
                height: 32
              }]}>
                <TextInput
                  style={[styles.smallInput, { color: colors.text }]}
                  value={maxFileSize.toString()}
                  onChangeText={setMaxFileSize}
                  keyboardType="numeric"
                  placeholder="100"
                />
                <Text style={[styles.smLabel, { color: colors.textPlaceholder }]}>KB</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    marginTop: 8,
    paddingBottom: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  checkboxGroup: {
    flex: 1,
    minWidth: 140,
    gap: 10,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  footerInputs: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  fileSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  smLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  smallInput: {
    fontSize: 12,
    fontWeight: '800',
    width: 40,
    textAlign: 'right',
    padding: 0,
    ...Platform.select({
      web: { outline: 'none' }
    })
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  densityRow: {
    flexDirection: 'row',
    gap: 4,
  },
  densityOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  densityText: {
    fontSize: 12,
  },
});

export default ProcessingOptions;