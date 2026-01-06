import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const LocalTab = ({
  loading,
  pickLocalFiles,
  pickLocalDirectory,
  isDragging
}) => {
  const { colors, borderRadius, spacing } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => pickLocalFiles()}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>📄 Select Files</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => pickLocalDirectory()}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>📁 Select Folder</Text>
        </TouchableOpacity>
      </View>

      <View style={[
        styles.dragDropArea,
        {
          backgroundColor: isDragging ? colors.surface : colors.surface,
          borderColor: isDragging ? colors.primary : colors.border,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderRadius: borderRadius.lg,
          marginTop: spacing.md
        }
      ]}>
        <Text style={[styles.dragDropText, { color: colors.textSecondary }]}>
          {isDragging ? 'Drop to upload' : 'Or drop files and folders here'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dragDropArea: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dragDropText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LocalTab;