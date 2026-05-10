import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const LocalTab = ({
  loading,
  pickLocalFiles,
  pickLocalDirectory,
  addLocalDirectory,
  isDragging,
  isMobile
}) => {
  const { colors, borderRadius, spacing, shadows, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.buttonRow, { flexDirection: isMobile ? 'column' : 'row' }]}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: isMobile ? 12 : 16
            }
          ]}
          onPress={() => pickLocalFiles()}
          disabled={loading}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Icon name="file" size={18} color={colors.text} />
          </View>
          <Text style={[styles.buttonText, { color: colors.text }]}>Files</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: isMobile ? 12 : 16
            }
          ]}
          onPress={() => pickLocalDirectory()}
          disabled={loading}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Icon name="folder" size={18} color={colors.text} />
          </View>
          <Text style={[styles.buttonText, { color: colors.text }]}>Folder</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.md,
              paddingVertical: isMobile ? 12 : 16,
              ...shadows.sm
            }
          ]}
          onPress={() => addLocalDirectory?.()}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Icon name="folder" size={18} color={isDark ? '#000' : '#fff'} />
          </View>
          <Text style={[styles.buttonText, { color: isDark ? '#000' : '#fff' }]}>Add More</Text>
        </TouchableOpacity>
      </View>

      <View style={[
        styles.dragDropArea,
        {
          backgroundColor: isDragging ? colors.text + '10' : colors.surface,
          borderColor: isDragging ? colors.text : colors.border,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderRadius: borderRadius.lg,
          marginTop: spacing.md,
          height: isMobile ? 80 : 100,
        }
      ]}>
        <Icon name="upload" size={24} color={isDragging ? colors.text : colors.textPlaceholder} />
        <Text style={[styles.dragDropText, { color: isDragging ? colors.text : colors.textSecondary, fontSize: isMobile ? 12 : 14, marginTop: 8 }]}>
          {isDragging ? 'Drop to scan' : 'Drag & drop projects here'}
        </Text>
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