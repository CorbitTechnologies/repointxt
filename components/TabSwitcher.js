import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const TabSwitcher = ({ activeTab, setActiveTab }) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.xs }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'github' && { backgroundColor: colors.card, ...shadows.sm }
        ]}
        onPress={() => setActiveTab('github')}
      >
        <Text style={[
          styles.tabText,
          { color: activeTab === 'github' ? colors.primary : colors.textSecondary }
        ]}>
          📦 GitHub
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'local' && { backgroundColor: colors.card, ...shadows.sm }
        ]}
        onPress={() => setActiveTab('local')}
      >
        <Text style={[
          styles.tabText,
          { color: activeTab === 'local' ? colors.primary : colors.textSecondary }
        ]}>
          📁 Local Files
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default TabSwitcher;