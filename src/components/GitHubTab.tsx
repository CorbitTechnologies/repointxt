import React from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';
import SourceInputs from './SourceInputs';

const GitHubTab: React.FC<any> = (props) => {
  const { colors, borderRadius, spacing } = useTheme();

  return (
    <div style={{ width: '100%' }}>
      <SourceInputs {...props} />
      <div style={{
        display: 'flex',
        flexDirection: props.isMobile ? 'column' : 'row',
        gap: 8,
        marginTop: 10
      }}>
        <button
          style={{
            flex: props.isMobile ? 'none' : 2,
            width: props.isMobile ? '100%' : 'auto',
            backgroundColor: colors.primaryButtonBg,
            borderRadius: borderRadius.md,
            padding: props.isMobile ? '10px 14px' : '9px 16px',
            border: 'none',
            cursor: props.loading ? 'default' : 'pointer',
            opacity: props.loading ? 0.75 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(31, 111, 235, 0.3)',
            color: '#ffffff'
          }}
          onClick={() => props.fetchGitHubRepo(false)}
          disabled={props.loading}
        >
          {props.loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon name="zap" size={15} color="#ffffff" />
              <span style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>Scanning Codebase...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Icon name="github" size={16} color="#ffffff" />
              <span style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>Scan Repository</span>
            </div>
          )}
        </button>

        <button
          style={{
            flex: props.isMobile ? 'none' : 1,
            width: props.isMobile ? '100%' : 'auto',
            backgroundColor: colors.surface,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: 'solid',
            padding: props.isMobile ? '10px 14px' : '9px 14px',
            cursor: props.loading ? 'default' : 'pointer',
            opacity: props.loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text
          }}
          onClick={() => props.fetchGitHubRepo(true)}
          disabled={props.loading}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="plus" size={15} color={colors.primary} />
            <span style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Add Source</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default GitHubTab;
