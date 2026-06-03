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
  const { colors, borderRadius, spacing, shadows } = useTheme();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, zIndex: 3000 }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="github" size={12} color={colors.textSecondary} />
            <span style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textSecondary }}>Repository URL</span>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: colors.surface,
              borderColor: isUrlFocused ? colors.primary : colors.border,
              color: colors.text,
              borderRadius: 6,
              padding: '10px 12px',
              borderWidth: 1,
              borderStyle: 'solid',
              fontSize: 13,
              fontWeight: '500',
              outline: 'none'
            }}
            placeholder="owner/repo or full url"
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
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              marginTop: 4,
              borderWidth: 1,
              borderStyle: 'solid',
              padding: 4,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              {filteredHistory.slice(0, 5).map((url, index) => (
                <button
                  key={index}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderBottomColor: colors.border,
                    borderBottomWidth: index < Math.min(filteredHistory.length, 5) - 1 ? 1 : 0,
                    borderBottomStyle: 'solid',
                    padding: 12,
                    cursor: 'pointer',
                    borderRadius: 6,
                    marginBottom: 2
                  }}
                  onClick={() => handleSuggestionClick(url)}
                >
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="link" size={14} color={colors.primary} />
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, zIndex: 1000 }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textSecondary }}>Access Token</span>
          </div>
          <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Icon name="external-link" size={12} color={colors.textSecondary} />
          </a>
        </div>
        <input
          style={{
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: colors.surface,
            borderColor: isTokenFocused ? colors.primary : colors.border,
            color: colors.text,
            borderRadius: 6,
            padding: '10px 12px',
            borderWidth: 1,
            borderStyle: 'solid',
            fontSize: 13,
            fontWeight: '500',
            outline: 'none'
          }}
          type="password"
          placeholder="Optional for public repos"
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
