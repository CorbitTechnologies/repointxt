import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const TabSwitcher = ({ activeTab, setActiveTab }) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xs }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'github' && {
            backgroundColor: colors.card,
            ...shadows.sm,
            borderRadius: borderRadius.lg
          }
        ]}
        onPress={() => setActiveTab('github')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.tabText,
          {
            color: activeTab === 'github' ? colors.primary : colors.textSecondary,
            fontWeight: activeTab === 'github' ? '800' : '600'
          }
        ]}>
          📦 GitHub Repo
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'local' && {
            backgroundColor: colors.card,
            ...shadows.sm,
            borderRadius: borderRadius.lg
          }
        ]}
        onPress={() => setActiveTab('local')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.tabText,
          {
            color: activeTab === 'local' ? colors.primary : colors.textSecondary,
            fontWeight: activeTab === 'local' ? '800' : '600'
          }
        ]}>
          📁 Local Project
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
});

export default TabSwitcher;