import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';
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
  const { colors, borderRadius, spacing, shadows, isDark } = useTheme();

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
              borderRadius: borderRadius.md,
              ...shadows.sm
            }
          ]}
          onPress={() => fetchGitHubRepo(false)}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={isDark ? '#000' : '#fff'} size="small" />
          ) : (
            <View style={styles.innerButton}>
              <Icon name="github" size={18} color={isDark ? '#000' : '#fff'} />
              <Text style={[styles.buttonText, { color: isDark ? '#000' : '#fff' }]}>Scan Repo</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.surface,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors.border,
              flex: 1,
            }
          ]}
          onPress={() => fetchGitHubRepo(true)}
          disabled={loading}
          activeOpacity={0.7}
        >
          <View style={styles.innerButton}>
            <Icon name="plus" size={16} color={colors.text} />
            <Text style={[styles.buttonTextSecondary, { color: colors.text }]}>Add More</Text>
          </View>
        </TouchableOpacity>

        {dirStructure ? (
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.surface,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: colors.border,
                width: 50,
              }
            ]}
            onPress={() => copyDirectoryStructure()}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Icon name="copy" size={16} color={colors.text} />
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
    paddingVertical: 16,
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
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonTextSecondary: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default GitHubTab;