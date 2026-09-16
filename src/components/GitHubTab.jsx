import React from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';
import SourceInputs from './SourceInputs';

const GitHubTab = (props) => {
  const { colors, borderRadius, spacing, shadows } = useTheme();

  return (
    <div style={{ width: '100%' }}>
      <SourceInputs {...props} />
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12, marginTop: spacing.md }}>
        <button
          style={{
            flex: 2,
            backgroundColor: colors.primary,
            borderRadius: borderRadius.md,
            padding: props.isMobile ? '12px 16px' : '14px 20px',
            border: 'none',
            cursor: props.loading ? 'default' : 'pointer',
            opacity: props.loading ? 0.75 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 14px rgba(0, 85, 255, 0.35)',
            color: '#ffffff'
          }}
          onClick={() => props.fetchGitHubRepo(false)}
          disabled={props.loading}
        >
          {props.loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="zap" size={16} color="#ffffff" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>Scanning Codebase...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Icon name="github" size={18} color="#ffffff" />
              <span style={{ color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 }}>Scan Repository</span>
            </div>
          )}
        </button>

        <button
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: 'solid',
            padding: props.isMobile ? '12px 16px' : '14px 16px',
            cursor: props.loading ? 'default' : 'pointer',
            opacity: props.loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease-in-out',
            color: colors.text
          }}
          onClick={() => props.fetchGitHubRepo(true)}
          disabled={props.loading}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="plus" size={16} color={colors.primary} />
            <span style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>Add Source</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default GitHubTab;