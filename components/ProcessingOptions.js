import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTheme } from '../hooks/useTheme';
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
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ⚙️ Configuration & Filters
          </Text>
        </View>
        <Text style={[styles.toggleIcon, { color: colors.primary }]}>
          {isCollapsed ? '▼' : '▲'}
        </Text>
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={styles.content}>
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Token Density Level</Text>
            <View style={[styles.densityRow, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 2, flexDirection: isMobile ? 'column' : 'row' }]}>
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
                      borderRadius: borderRadius.md,
                      ...shadows.sm
                    }
                  ]}
                  onPress={() => setTokenOptimizationLevel(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.densityText,
                    {
                      color: tokenOptimizationLevel === opt.value ? colors.primary : colors.textSecondary,
                      fontWeight: tokenOptimizationLevel === opt.value ? '800' : '600'
                    }
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              {tokenOptimizationLevel === 0 ? "Full readable headers (path + delimiter)" :
                tokenOptimizationLevel === 1 ? "Compact headers (balanced size/readability)" :
                  "Ultra-compact (f:[path]), maximum token efficiency."}
            </Text>
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
            <View style={{ flex: 1, marginBottom: isMobile ? 20 : 0 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Ignore Patterns</Text>
              <BubbleInput
                patterns={ignorePatterns}
                setPatterns={setIgnorePatterns}
                placeholder="node_modules, .git..."
              />
            </View>
            <View style={{ width: isMobile ? '100%' : 130 }}>
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 6 }]}>Max Size</Text>
              <View style={[styles.fileSizeRow, {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.md,
                paddingHorizontal: spacing.sm,
                height: 38
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
    paddingVertical: 12,
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  toggleIcon: {
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    marginTop: 8,
    paddingBottom: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  checkboxGroup: {
    flex: 1,
    minWidth: 160,
    gap: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  footerInputs: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  fileSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  smLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  smallInput: {
    fontSize: 13,
    fontWeight: '800',
    width: 45,
    textAlign: 'right',
    padding: 0,
    ...Platform.select({
      web: { outline: 'none' }
    })
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  densityRow: {
    flexDirection: 'row',
    gap: 4,
  },
  densityOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  densityText: {
    fontSize: 13,
  },
  hintText: {
    fontSize: 12,
    marginTop: 10,
    opacity: 0.8,
    lineHeight: 18,
  }
});

export default ProcessingOptions;