import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import Checkbox from './Checkbox';

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
}) => {
  const { colors, borderRadius, spacing } = useTheme();
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
            ⚙️ Optimization & Filters
          </Text>
        </View>
        <Text style={[styles.toggleIcon, { color: colors.primary }]}>
          {isCollapsed ? '▼' : '▲'}
        </Text>
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={styles.content}>
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Token Density</Text>
            <View style={[styles.densityRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: 4 }]}>
              {[
                { label: 'Standard', value: 0 },
                { label: 'Compact', value: 1 },
                { label: 'Minified', value: 2 }
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.densityOption,
                    tokenOptimizationLevel === opt.value && { backgroundColor: colors.primary, borderRadius: borderRadius.sm - 2 }
                  ]}
                  onPress={() => setTokenOptimizationLevel(opt.value)}
                >
                  <Text style={[
                    styles.densityText,
                    { color: tokenOptimizationLevel === opt.value ? '#fff' : colors.textSecondary }
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              {tokenOptimizationLevel === 0 ? "Full headers, easy to read." :
                tokenOptimizationLevel === 1 ? "Reduced headers, balanced." :
                  "Maximum density, minimal overhead (f:[path])."}
            </Text>
          </View>

          <View style={styles.optionsGrid}>
            <View style={styles.checkboxGroup}>
              <Checkbox
                label="Clean Comments"
                checked={removeComments}
                onPress={() => setRemoveComments(!removeComments)}
              />
              <Checkbox
                label="Trim Whitespace"
                checked={removeExtraWhitespace}
                onPress={() => setRemoveExtraWhitespace(!removeExtraWhitespace)}
              />
            </View>

            <View style={styles.checkboxGroup}>
              <Checkbox
                label="Text Files Only"
                checked={includeOnlyCode}
                onPress={() => setIncludeOnlyCode(!includeOnlyCode)}
              />
              <View style={[styles.fileSizeRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.xs }]}>
                <Text style={[styles.smLabel, { color: colors.textSecondary }]}>Limit:</Text>
                <TextInput
                  style={[styles.smallInput, { color: colors.text, borderBottomColor: colors.primary }]}
                  value={maxFileSize}
                  onChangeText={setMaxFileSize}
                  keyboardType="numeric"
                />
                <Text style={[styles.smLabel, { color: colors.textSecondary }]}>KB</Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Ignore Patterns</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
                borderRadius: borderRadius.md,
                padding: spacing.sm,
                minHeight: 60
              }]}
              placeholder="node_modules, .git, dist..."
              placeholderTextColor={colors.textPlaceholder}
              value={ignorePatterns}
              onChangeText={setIgnorePatterns}
              multiline
              autoCapitalize="none"
            />
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
    paddingVertical: 4,
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleIcon: {
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    marginTop: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
  },
  checkboxGroup: {
    flex: 1,
    minWidth: 140,
    gap: 8,
  },
  fileSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  smLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  smallInput: {
    fontSize: 12,
    fontWeight: '700',
    width: 35,
    textAlign: 'center',
    borderBottomWidth: 1,
    padding: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    fontSize: 14,
    borderWidth: 1,
    textAlignVertical: 'top',
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
    fontWeight: '700',
  },
  hintText: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  }
});

export default ProcessingOptions;