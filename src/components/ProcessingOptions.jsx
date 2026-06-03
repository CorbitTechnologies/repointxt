import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';
import Checkbox from './Checkbox';
import BubbleInput from './BubbleInput';

const ProcessingOptions = ({
  removeComments, setRemoveComments,
  removeExtraWhitespace, setRemoveExtraWhitespace,
  includeOnlyCode, setIncludeOnlyCode,
  maxFileSize, setMaxFileSize,
  ignorePatterns, setIgnorePatterns,
  tokenOptimizationLevel, setTokenOptimizationLevel,
  respectGitignore, setRespectGitignore
}) => {
  const { colors, borderRadius, spacing } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleOptimizationChange = (level) => {
    setTokenOptimizationLevel(level);
    if (level > 0) {
      setRemoveComments(true);
      setRemoveExtraWhitespace(true);
    }
  };

  const formatPatterns = (patternsStr) => {
    return patternsStr ? patternsStr.split(',').map(p => p.trim()).filter(Boolean) : [];
  };

  const handlePatternsChange = (newPatternsStr) => {
    setIgnorePatterns(newPatternsStr);
  };

  return (
    <div style={{
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'solid',
      overflow: 'hidden',
    }}>
      <button
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 16,
          backgroundColor: isExpanded ? colors.surface : 'transparent',
          border: 'none',
          width: '100%',
          cursor: 'pointer'
        }}
        onClick={toggleExpand}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="settings" size={14} color={colors.textSecondary} />
          <span style={{ fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.text }}>
            LLM Optimization Settings
          </span>
        </div>
        <div style={{ transform: `rotate(${isExpanded ? 180 : 0}deg)`, transition: 'transform 0.2s' }}>
          <Icon name="chevron-down" size={14} color={colors.textSecondary} />
        </div>
      </button>

      {isExpanded && (
        <div style={{ padding: '0 16px 16px 16px' }}>
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, display: 'block', textTransform: 'uppercase' }}>
              Token Reduction
            </span>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[
                { level: 0, label: 'None' },
                { level: 1, label: 'Light' },
                { level: 2, label: 'Aggressive' }
              ].map((opt) => (
                <button
                  key={opt.level}
                  onClick={() => handleOptimizationChange(opt.level)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: borderRadius.md,
                    borderWidth: 1,
                    borderColor: tokenOptimizationLevel === opt.level ? colors.primary : colors.border,
                    borderStyle: 'solid',
                    backgroundColor: tokenOptimizationLevel === opt.level ? colors.primary + '15' : colors.surface,
                    cursor: 'pointer'
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    fontWeight: tokenOptimizationLevel === opt.level ? '700' : '500',
                    color: tokenOptimizationLevel === opt.level ? colors.primary : colors.text
                  }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ paddingLeft: 8 }}>
              <Checkbox
                label="Remove Code Comments"
                checked={removeComments}
                onChange={setRemoveComments}
              />
              <Checkbox
                label="Remove Extra Whitespace"
                checked={removeExtraWhitespace}
                onChange={setRemoveExtraWhitespace}
              />
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: colors.border, margin: '16px 0' }} />

          <div>
            <span style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, display: 'block', textTransform: 'uppercase' }}>
              Filtering
            </span>
            <div style={{ paddingLeft: 8, marginBottom: 12 }}>
              <Checkbox
                label="Respect .gitignore files"
                checked={respectGitignore}
                onChange={setRespectGitignore}
              />
              <Checkbox
                label="Include Only Code Files (skip images, docs)"
                checked={includeOnlyCode}
                onChange={setIncludeOnlyCode}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6, display: 'block' }}>
                Skip files larger than (KB)
              </span>
              <input
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                  borderRadius: 6,
                  padding: '8px 12px',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  width: '100%',
                  boxSizing: 'border-box',
                  fontSize: 13,
                  outline: 'none'
                }}
                type="number"
                value={maxFileSize}
                onChange={(e) => setMaxFileSize(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>

            <div>
              <span style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 6, display: 'block' }}>
                Ignore Patterns
              </span>
              <BubbleInput
                values={formatPatterns(ignorePatterns)}
                setValues={handlePatternsChange}
              />
              <span style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, display: 'block' }}>
                Press Enter or Comma to add
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingOptions;
