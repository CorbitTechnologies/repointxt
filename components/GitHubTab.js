import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import SourceInputs from './SourceInputs';

const GitHubTab = ({
  githubUrl,
  setGithubUrl,
  githubToken,
  setGithubToken,
  loading,
  fetchGitHubRepo,
  copyDirectoryStructure,
  dirStructure,
  urlHistory,
}) => {
  const { colors, borderRadius, spacing } = useTheme();

  return (
    <View>
      <SourceInputs
        githubUrl={githubUrl}
        setGithubUrl={setGithubUrl}
        githubToken={githubToken}
        setGithubToken={setGithubToken}
        urlHistory={urlHistory}
      />
      <View style={[styles.buttonRow, { marginTop: spacing.lg }]}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary, borderRadius: borderRadius.md }]}
          onPress={() => fetchGitHubRepo()}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Scan Repository</Text>
          )}
        </TouchableOpacity>

        {dirStructure ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => copyDirectoryStructure()}
            disabled={loading}
          >
            <Text style={[styles.buttonTextSecondary, { color: colors.text }]}>Copy Tree</Text>
          </TouchableOpacity>
        ) : null}
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
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  primaryButton: {
    flex: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default GitHubTab;