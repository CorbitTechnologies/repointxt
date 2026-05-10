import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const TabSwitcher = ({ activeTab, setActiveTab }) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 4, borderWidth: 1, borderColor: colors.border }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'github' && {
            backgroundColor: colors.card,
            ...shadows.sm,
            borderRadius: borderRadius.md
          }
        ]}
        onPress={() => setActiveTab('github')}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="github" size={16} color={activeTab === 'github' ? colors.text : colors.textSecondary} />
          <Text style={[
            styles.tabText,
            {
              color: activeTab === 'github' ? colors.text : colors.textSecondary,
              fontWeight: activeTab === 'github' ? '800' : '600'
            }
          ]}>
            GitHub
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'local' && {
            backgroundColor: colors.card,
            ...shadows.sm,
            borderRadius: borderRadius.md
          }
        ]}
        onPress={() => setActiveTab('local')}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="folder" size={16} color={activeTab === 'local' ? colors.text : colors.textSecondary} />
          <Text style={[
            styles.tabText,
            {
              color: activeTab === 'local' ? colors.text : colors.textSecondary,
              fontWeight: activeTab === 'local' ? '800' : '600'
            }
          ]}>
            Local
          </Text>
        </View>
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
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
});

export default TabSwitcher;