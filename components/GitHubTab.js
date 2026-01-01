import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import SourceInputs from './SourceInputs';
import ProcessingOptions from './ProcessingOptions';

const GitHubTab = ({
  githubUrl,
  setGithubUrl,
  githubToken,
  setGithubToken,
  ignorePatterns,
  setIgnorePatterns,
  loading,
  fetchGitHubRepo,
  copyDirectoryStructure,
  dirStructure,
}) => {
  return (
    <View>
      <SourceInputs
        githubUrl={githubUrl}
        setGithubUrl={setGithubUrl}
        githubToken={githubToken}
        setGithubToken={setGithubToken}
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => fetchGitHubRepo()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Fetch Repository</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => copyDirectoryStructure()}
          disabled={loading || !dirStructure}
        >
          <Text style={styles.buttonTextSecondary}>Copy Directory Structure</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 8,
  },
  button: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GitHubTab;