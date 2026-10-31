import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { LLM_CONTEXT_LIMITS } from '../utils/constants';
import Icon from './Icon';
import Checkbox from './Checkbox';
import BubbleInput from './BubbleInput';
import { ProcessingOptionsState } from '../types';

interface ProcessingOptionsProps {
  options: ProcessingOptionsState;
  updateOption: <K extends keyof ProcessingOptionsState>(key: K, value: ProcessingOptionsState[K]) => void;
  isMobile?: boolean;
}

const ProcessingOptions: React.FC<ProcessingOptionsProps> = ({ options, updateOption, isMobile }) => {
  const { colors, borderRadius, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  // The slider is index-based, so the presets and their hints live in constants.ts.
  const limitIndex = LLM_CONTEXT_LIMITS.findIndex(l => l.value === options.maxContextTokens);
  const activeLimit = limitIndex >= 0
    ? LLM_CONTEXT_LIMITS[limitIndex]
    : { value: options.maxContextTokens, label: 'Custom', hint: 'Custom budget' };
  const sliderValue = limitIndex >= 0 ? limitIndex : LLM_CONTEXT_LIMITS.length - 1;

  return (
    <div style={{
      backgroundColor: isDark ? 'rgba(22, 27, 34, 0.65)' : 'rgba(246, 248, 250, 0.8)',
      borderRadius: borderRadius.md,
      border: `1px solid ${colors.border}`,
      overflow: 'hidden',
      marginTop: 12
    }}>
      <button
        type="button"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '9px 12px' : '9px 14px',
          backgroundColor: 'transparent',
          border: 'none',
          width: '100%',
          cursor: 'pointer',
          textAlign: 'left'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: 5,
            backgroundColor: isDark ? `${colors.primary}18` : 'rgba(9, 105, 218, 0.1)',
            flexShrink: 0
          }}>
            <Icon name="settings" size={11} color={isDark ? '#58a6ff' : '#0969da'} />
          </div>
          <span style={{
            fontSize: isMobile ? 12 : 12.5,
            fontWeight: '700',
            letterSpacing: -0.2,
            color: colors.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Processing Options & Limits
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <span style={{
            fontSize: 10.5,
            fontWeight: '600',
            color: isDark ? '#58a6ff' : '#0550ae',
            backgroundColor: isDark ? 'rgba(56, 139, 253, 0.1)' : 'rgba(5, 80, 174, 0.08)',
            padding: '2px 7px',
            borderRadius: 4,
            border: `1px solid ${isDark ? 'rgba(56, 139, 253, 0.25)' : 'rgba(5, 80, 174, 0.25)'}`,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
          }}>
            {options.maxContextTokens >= 1000000 ? `${options.maxContextTokens / 1000000}M` : options.maxContextTokens > 0 ? `${options.maxContextTokens / 1000}K` : 'No Limit'}
          </span>
          <Icon name={isExpanded ? "chevron-down" : "chevron-right"} size={13} color={colors.textSecondary} />
        </div>
      </button>

      {isExpanded && (
        <div style={{
          padding: isMobile ? '0 12px 14px 12px' : '0 14px 14px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}>
          <div style={{ height: 1, backgroundColor: colors.border, width: '100%' }} />

          {/* ── TARGET LLM CONTEXT LIMIT SLIDER ── */}
          <div style={{
            backgroundColor: isDark ? 'rgba(13, 17, 23, 0.6)' : 'rgba(255, 255, 255, 0.8)',
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: '700', color: colors.text }}>
                  Target LLM Context Limit
                </span>
                {!isMobile && (
                  <span style={{ fontSize: 10, color: isDark ? '#8b949e' : '#57606a' }}>
                    (Chunking threshold)
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontWeight: 700,
                  color: '#58a6ff',
                  backgroundColor: 'rgba(56, 139, 253, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: '1px solid rgba(56, 139, 253, 0.28)'
                }}>
                  {activeLimit.value === 0
                    ? 'No Limit'
                    : activeLimit.value >= 1000000
                      ? `${(activeLimit.value / 1000000).toFixed(1)}M tokens`
                      : `${Math.round(activeLimit.value / 1000)}k tokens`}
                </span>
                <span style={{
                  fontSize: 10.5,
                  color: activeLimit.value >= 1000000 ? '#38bdf8' : '#3fb950',
                  fontWeight: '600'
                }}>
                  {activeLimit.hint}
                </span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={LLM_CONTEXT_LIMITS.length - 1}
              step="1"
              className="context-slider"
              value={sliderValue}
              onChange={(e) => {
                const selected = LLM_CONTEXT_LIMITS[Number(e.target.value)];
                if (selected) updateOption('maxContextTokens', selected.value);
              }}
            />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: isMobile ? 8.5 : 10,
              color: '#8b949e',
              marginTop: 2,
              padding: '0 2px'
            }}>
              {LLM_CONTEXT_LIMITS.map(item => {
                const isActive = options.maxContextTokens === item.value;
                return (
                  <span
                    key={item.value}
                    style={{
                      cursor: 'pointer',
                      color: isActive ? '#58a6ff' : '#8b949e',
                      fontWeight: isActive ? 700 : 500,
                      padding: '2px 4px', // Touch-friendly tap surface
                    }}
                    onClick={() => updateOption('maxContextTokens', item.value)}
                  >
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* ── ROW: OUTPUT FORMAT SWITCHER ── */}
          <div style={{
            backgroundColor: isDark ? 'rgba(13, 17, 23, 0.6)' : 'rgba(255, 255, 255, 0.8)',
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : colors.border}`,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: '700', color: colors.text }}>
                Prompt Output Format
              </div>
              <div style={{ fontSize: 10, color: isDark ? '#8b949e' : '#57606a' }}>
                XML tags for Claude 5.5 / GPT-6, or Markdown code blocks for DeepSeek / open models
              </div>
            </div>
            <div style={{
              display: 'inline-flex',
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: 6,
              padding: 2,
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
            }}>
              <button
                type="button"
                onClick={() => updateOption('outputFormat', 'xml')}
                style={{
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: (options.outputFormat || 'xml') === 'xml' ? (isDark ? '#21262d' : '#ffffff') : 'transparent',
                  color: (options.outputFormat || 'xml') === 'xml' ? '#58a6ff' : colors.textSecondary,
                  boxShadow: (options.outputFormat || 'xml') === 'xml' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                XML (&lt;file&gt;)
              </button>
              <button
                type="button"
                onClick={() => updateOption('outputFormat', 'markdown')}
                style={{
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: options.outputFormat === 'markdown' ? (isDark ? '#21262d' : '#ffffff') : 'transparent',
                  color: options.outputFormat === 'markdown' ? '#58a6ff' : colors.textSecondary,
                  boxShadow: options.outputFormat === 'markdown' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Markdown (## File)
              </button>
            </div>
          </div>

          {/* ── ROW: CLEANING FLAGS & FILE SIZE LIMIT ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr',
            gap: 12,
            alignItems: 'start'
          }}>
            {/* Optimization switches */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              backgroundColor: isDark ? 'rgba(13, 17, 23, 0.4)' : 'rgba(255, 255, 255, 0.8)',
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.04)' : colors.border}`
            }}>
              <span style={{ fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: isDark ? '#8b949e' : '#57606a', marginBottom: 2 }}>
                Token Compression
              </span>
              <Checkbox
                label="Strip Code Comments"
                checked={options.removeComments}
                onChange={(val) => updateOption('removeComments', val)}
              />
              <Checkbox
                label="Trim Redundant Whitespace"
                checked={options.removeExtraWhitespace}
                onChange={(val) => updateOption('removeExtraWhitespace', val)}
              />
            </div>

            {/* Single file threshold */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              backgroundColor: isDark ? 'rgba(13, 17, 23, 0.4)' : 'rgba(255, 255, 255, 0.8)',
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.04)' : colors.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: isDark ? '#8b949e' : '#57606a' }}>
                  Max File Limit
                </span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: colors.text, fontWeight: 600 }}>
                  {options.maxFileSize} KB
                </span>
              </div>
              <input
                type="number"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: colors.surface,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  padding: '5px 8px',
                  fontSize: 12,
                  outline: 'none'
                }}
                value={options.maxFileSize}
                onChange={(e) => updateOption('maxFileSize', Number(e.target.value))}
                placeholder="250"
              />
            </div>
          </div>

          {/* ── IGNORED PATTERNS CHIPS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                Excluded Folders & Patterns
              </span>
              <span style={{ fontSize: 10.5, color: isDark ? '#8b949e' : '#57606a' }}>
                Type and hit Enter or comma to add
              </span>
            </div>
            <BubbleInput
              values={options.ignorePatterns ? options.ignorePatterns.split(',').map(s => s.trim()).filter(Boolean) : []}
              setValues={(val) => updateOption('ignorePatterns', val)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingOptions;
