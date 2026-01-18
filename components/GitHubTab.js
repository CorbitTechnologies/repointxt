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
  const { colors, borderRadius, spacing, shadows } = useTheme();

  return (
    <View style={styles.container}>
      <SourceInputs
        githubUrl={githubUrl}
        setGithubUrl={setGithubUrl}
        githubToken={githubToken}
        setGithubToken={setGithubToken}
        urlHistory={urlHistory}
      />
      <View style={[styles.buttonRow, { marginTop: spacing.md }]}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.lg,
              ...shadows.md
            }
          ]}
          onPress={() => fetchGitHubRepo()}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.innerButton}>
              <Text style={styles.buttonText}>Scan Repository</Text>
              <Text style={styles.buttonIcon}>✨</Text>
            </View>
          )}
        </TouchableOpacity>

        {dirStructure ? (
          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderWidth: 1.5,
                borderColor: colors.border,
              }
            ]}
            onPress={() => copyDirectoryStructure()}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonTextSecondary, { color: colors.text }]}>📋 Copy Tree</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.2s ease-in-out' }
    })
  },
  primaryButton: {
    flex: 2,
  },
  secondaryButton: {
    flex: 1.2,
  },
  innerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonIcon: {
    fontSize: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonTextSecondary: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default GitHubTab;