import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Checkbox from './Checkbox';

const ProcessingOptions = ({
  removeComments,
  setRemoveComments,
  removeExtraWhitespace,
  setRemoveExtraWhitespace,
  includeOnlyCode,
  setIncludeOnlyCode,
  maxFileSize,
  setMaxFileSize,
  ignorePatterns,
  setIgnorePatterns,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>LLM Enhancement Options</Text>

      <View style={styles.optionsRow}>
        <View style={styles.checkboxColumn}>
          <Checkbox
            label="Remove comments"
            checked={removeComments}
            onPress={() => setRemoveComments(!removeComments)}
          />
          <Checkbox
            label="Remove extra whitespace"
            checked={removeExtraWhitespace}
            onPress={() => setRemoveExtraWhitespace(!removeExtraWhitespace)}
          />
        </View>
        <View style={styles.checkboxColumn}>
          <Checkbox
            label="Include only code files"
            checked={includeOnlyCode}
            onPress={() => setIncludeOnlyCode(!includeOnlyCode)}
          />
          <View style={styles.fileSizeContainer}>
            <Text style={styles.fileSizeLabel}>Max file size:</Text>
            <TextInput
              style={styles.fileSizeInput}
              placeholder="100"
              value={maxFileSize}
              onChangeText={setMaxFileSize}
              keyboardType="numeric"
            />
            <Text style={styles.fileSizeUnit}>KB</Text>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Ignore Patterns (comma-separated)</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="node_modules, .git, dist"
        value={ignorePatterns}
        onChangeText={setIgnorePatterns}
        multiline
        numberOfLines={2}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkboxColumn: {
    flex: 1,
    marginRight: 10,
  },
  fileSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  fileSizeLabel: {
    fontSize: 11,
    color: '#666',
    marginRight: 6,
  },
  fileSizeInput: {
    flex: 1,
    fontSize: 11,
    color: '#333',
    paddingVertical: 2,
    paddingHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlign: 'center',
    minWidth: 40,
  },
  fileSizeUnit: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: '#333',
  },
  multilineInput: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
});

export default ProcessingOptions;