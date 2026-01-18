import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const LocalTab = ({
  loading,
  pickLocalFiles,
  pickLocalDirectory,
  isDragging,
  isMobile
}) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.buttonRow, { flexDirection: isMobile ? 'column' : 'row' }]}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              borderWidth: 1.5,
              borderColor: colors.border,
              paddingVertical: isMobile ? 16 : 24
            }
          ]}
          onPress={() => pickLocalFiles()}
          disabled={loading}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10' }]}>
            <Text style={styles.icon}>📄</Text>
          </View>
          <Text style={[styles.buttonText, { color: colors.text }]}>Select Files</Text>
          <Text style={[styles.buttonSubtext, { color: colors.textSecondary }]}>Choose specific files</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              borderWidth: 1.5,
              borderColor: colors.border,
              paddingVertical: isMobile ? 16 : 24
            }
          ]}
          onPress={() => pickLocalDirectory()}
          disabled={loading}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '10' }]}>
            <Text style={styles.icon}>📁</Text>
          </View>
          <Text style={[styles.buttonText, { color: colors.text }]}>Select Folder</Text>
          <Text style={[styles.buttonSubtext, { color: colors.textSecondary }]}>Entire directory tree</Text>
        </TouchableOpacity>
      </View>

      <View style={[
        styles.dragDropArea,
        {
          backgroundColor: isDragging ? colors.primary + '15' : colors.surface,
          borderColor: isDragging ? colors.primary : colors.border,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderRadius: borderRadius.xl,
          marginTop: spacing.lg,
          height: isMobile ? 120 : 160,
          ...shadows.sm
        }
      ]}>
        <Text style={[styles.dragIcon, { fontSize: isMobile ? 32 : 40 }]}>{isDragging ? '📥' : '☁️'}</Text>
        <Text style={[styles.dragDropText, { color: isDragging ? colors.primary : colors.textSecondary, fontSize: isMobile ? 14 : 16 }]}>
          {isDragging ? 'Drop to start scanning' : 'Drag & drop projects here'}
        </Text>
        {!isDragging && (
          <Text style={[styles.dragDropHint, { color: colors.textPlaceholder, fontSize: isMobile ? 11 : 13 }]}>
            Optimized for large repos
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.2s ease-in-out' }
    })
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 18,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  buttonSubtext: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.7,
  },
  dragDropArea: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    ...Platform.select({
      web: { transition: 'background-color 0.2s ease' }
    })
  },
  dragIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  dragDropText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  dragDropHint: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  }
});

export default LocalTab;