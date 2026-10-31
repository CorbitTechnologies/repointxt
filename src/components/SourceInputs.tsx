import React, { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

interface SourceInputsProps {
  githubUrl: string;
  setGithubUrl: (url: string) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  urlHistory?: string[];
}

const SourceInputs: React.FC<SourceInputsProps> = ({
  githubUrl,
  setGithubUrl,
  githubToken,
  setGithubToken,
  urlHistory = [],
}) => {
  const { colors, borderRadius } = useTheme();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUrlFocused, setIsUrlFocused] = useState(false);
  const [isTokenFocused, setIsTokenFocused] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState<string[]>([]);

  useEffect(() => {
    if (githubUrl && urlHistory.length > 0) {
      const filtered = urlHistory.filter(url =>
        url.toLowerCase().includes(githubUrl.toLowerCase()) && url !== githubUrl
      );
      setFilteredHistory(filtered);
      setShowSuggestions(filtered.length > 0 && isUrlFocused);
    } else if (isUrlFocused && urlHistory.length > 0 && !githubUrl) {
      setFilteredHistory(urlHistory);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [githubUrl, urlHistory, isUrlFocused]);

  const handleSuggestionClick = (url: string) => {
    setGithubUrl(url);
    setTimeout(() => setShowSuggestions(false), 50);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="github" size={13} color={colors.primary} />
            <span style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.text }}>GitHub Repository URL or Slug</span>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: colors.surface,
              borderColor: isUrlFocused ? colors.primary : colors.border,
              boxShadow: isUrlFocused ? `0 0 0 3px ${colors.primary}25` : 'none',
              color: colors.text,
              borderRadius: borderRadius.md,
              padding: '8px 12px',
              borderWidth: 1,
              borderStyle: 'solid',
              fontSize: 13,
              fontWeight: '500',
              outline: 'none'
            }}
            placeholder="e.g. facebook/react or https://github.com/supabase/supabase"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            onFocus={() => setIsUrlFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsUrlFocused(false), 300);
            }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
          {showSuggestions && filteredHistory.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 9999,
              overflow: 'hidden',
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              marginTop: 6,
              borderWidth: 1,
              borderStyle: 'solid',
              padding: 6,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
            }}>
              <div style={{ fontSize: 10, fontWeight: '800', color: colors.textSecondary, padding: '4px 8px', textTransform: 'uppercase' }}>Recent Repositories</div>
              {filteredHistory.slice(0, 5).map((url, index) => (
                <button
                  key={index}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    borderRadius: 6,
                    marginBottom: 2
                  }}
                  onClick={() => handleSuggestionClick(url)}
                >
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="link" size={13} color={colors.primary} />
                    <span style={{ fontSize: 13, fontWeight: '600', color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {url.replace(/^https?:\/\/github\.com\//i, '')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', zIndex: 1, marginTop: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.textSecondary }}>Personal Access Token</span>
            <span style={{ fontSize: 10, fontWeight: '700', backgroundColor: colors.surface, color: colors.textSecondary, padding: '2px 6px', borderRadius: 4, border: `1px solid ${colors.border}` }}>Optional for Public Repos</span>
          </div>
          <a
            href="https://github.com/settings/tokens/new?description=repointxt%20Codebase%20Context%20Packer&scopes=repo"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              textDecoration: 'none',
              fontSize: 11.5,
              color: colors.primary,
              fontWeight: '700',
              padding: '6px 8px',
              minHeight: 28,
              borderRadius: 4,
            }}
          >
            <span>Generate Token</span>
            <Icon name="external-link" size={12} color={colors.primary} />
          </a>
        </div>
        <input
          style={{
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: colors.surface,
            borderColor: isTokenFocused ? colors.primary : colors.border,
            boxShadow: isTokenFocused ? `0 0 0 3px ${colors.primary}25` : 'none',
            color: colors.text,
            borderRadius: borderRadius.md,
            padding: '9px 12px',
            minHeight: 40,
            borderWidth: 1,
            borderStyle: 'solid',
            fontSize: 13,
            fontWeight: '500',
            outline: 'none',
            marginTop: 2
          }}
          type="password"
          placeholder="ghp_... or github_pat_..."
          value={githubToken}
          onChange={(e) => setGithubToken(e.target.value)}
          onFocus={() => setIsTokenFocused(true)}
          onBlur={() => setIsTokenFocused(false)}
          autoCapitalize="none"
        />
      </div>
    </div>
  );
};

export default SourceInputs;
