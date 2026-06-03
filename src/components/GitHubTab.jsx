import React from 'react';
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
  isMobile
}) => {
  const { colors, borderRadius, spacing, shadows, isDark } = useTheme();

  return (
    <div style={{ width: '100%' }}>
      <SourceInputs
        githubUrl={githubUrl}
        setGithubUrl={setGithubUrl}
        githubToken={githubToken}
        setGithubToken={setGithubToken}
        urlHistory={urlHistory}
      />
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12, marginTop: spacing.md }}>
        <button
          style={{
            flex: 2,
            backgroundColor: colors.primary,
            borderRadius: borderRadius.md,
            padding: isMobile ? '12px 16px' : '16px',
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease-in-out',
            ...shadows.sm
          }}
          onClick={() => fetchGitHubRepo(false)}
          disabled={loading}
        >
          {loading ? (
            <span style={{ color: isDark ? '#000' : '#fff' }}>Loading...</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Icon name="github" size={18} color={isDark ? '#000' : '#fff'} />
              <span style={{ color: isDark ? '#000' : '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }}>Scan Repo</span>
            </div>
          )}
        </button>

        <button
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: 'solid',
            padding: isMobile ? '12px 16px' : '16px',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease-in-out'
          }}
          onClick={() => fetchGitHubRepo(true)}
          disabled={loading}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Icon name="plus" size={16} color={colors.text} />
            <span style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Add More</span>
          </div>
        </button>

        {dirStructure ? (
          <button
            style={{
              backgroundColor: colors.surface,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors.border,
              borderStyle: 'solid',
              width: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
            onClick={() => copyDirectoryStructure()}
            disabled={loading}
          >
            <Icon name="copy" size={16} color={colors.text} />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default GitHubTab;
