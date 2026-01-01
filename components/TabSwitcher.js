import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const TabSwitcher = ({ activeTab, setActiveTab }) => {
  return (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'github' && styles.activeTab]}
        onPress={() => setActiveTab('github')}
      >
        <Text style={[styles.tabText, activeTab === 'github' && styles.activeTabText]}>
          📦 GitHub
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'local' && styles.activeTab]}
        onPress={() => setActiveTab('local')}
      >
        <Text style={[styles.tabText, activeTab === 'local' && styles.activeTabText]}>
          📁 Local Files
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
});

export default TabSwitcher;