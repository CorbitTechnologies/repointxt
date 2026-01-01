import React from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';

const OutputSection = ({ output, tokenCount }) => {
  if (!output) return null;

  return (
    <View style={styles.outputSection}>
      <View style={styles.statsRow}>
        <Text style={styles.statItem}>Characters: {output.length.toLocaleString()}</Text>
        <Text style={styles.statItem}>Tokens: ~{tokenCount.toLocaleString()}</Text>
        <Text style={styles.statItem}>Lines: {output.split('\n').length.toLocaleString()}</Text>
      </View>
      <Text style={styles.label}>Output</Text>
      <ScrollView style={styles.outputBox}>
        <Text style={styles.outputText}>{output}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outputSection: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  outputBox: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 5,
    maxHeight: 400,
  },
  outputText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
    lineHeight: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statItem: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
  },
});

export default OutputSection;