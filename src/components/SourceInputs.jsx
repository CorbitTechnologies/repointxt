import React, { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const SourceInputs = ({
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
  const [filteredHistory, setFilteredHistory] = useState([]);

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

  const handleSuggestionClick = (url) => {
    setGithubUrl(url);
    setTimeout(() => setShowSuggestions(false), 50);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, zIndex: 3000 }}>
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
              padding: '12px 14px',
              borderWidth: 1,
              borderStyle: 'solid',
              fontSize: 13.5,
              fontWeight: '500',
              outline: 'none',
              transition: 'all 0.2s ease'
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
                    marginBottom: 2,
                    transition: 'background 0.15s ease'
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, zIndex: 1000 }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.textSecondary }}>Personal Access Token</span>
            <span style={{ fontSize: 10, fontWeight: '700', backgroundColor: colors.surface, color: colors.textSecondary, padding: '1px 6px', borderRadius: 4, border: `1px solid ${colors.border}` }}>Optional for Public Repos</span>
          </div>
          <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: 11, color: colors.primary, fontWeight: '700' }}>
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
            padding: '10px 14px',
            borderWidth: 1,
            borderStyle: 'solid',
            fontSize: 13,
            fontWeight: '500',
            outline: 'none',
            transition: 'all 0.2s ease'
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