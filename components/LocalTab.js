import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ProcessingOptions from './ProcessingOptions';

const LocalTab = ({
  loading,
  pickLocalFiles,
  pickLocalDirectory,
  output,
  isDragging
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.localFilesButton]}
          onPress={() => pickLocalFiles()}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📄 Files</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.localDirButton]}
          onPress={() => pickLocalDirectory()}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📁 Directory</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.dragDropArea, isDragging && styles.draggingDropArea]}>
        <Text style={styles.dragDropText}>Or drag and drop files/folders here to process them</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // No specific styles, just a wrapper
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    flex: 1,
  },
  localFilesButton: {
    backgroundColor: '#FF9500',
    marginTop: 8,
  },
  localDirButton: {
    backgroundColor: '#5856D6',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dragDropArea: {
    marginTop: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  draggingDropArea: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  dragDropText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LocalTab;