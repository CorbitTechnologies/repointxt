import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const Checkbox = ({ label, checked, onPress }) => {
  return (
    <View style={styles.checkboxRow}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={onPress}
      >
        <View style={[styles.checkboxBox, checked && styles.checkboxChecked]}>
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  checkboxRow: {
    marginBottom: 6, // Reduced margin
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 16, // Reduced size
    height: 16, // Reduced size
    borderRadius: 3, // Slightly smaller border radius
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 6, // Reduced margin
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12, // Reduced font size
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 10, // Reduced font size
    color: '#333',
  },
});

export default Checkbox;