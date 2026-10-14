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
  const { colors, borderRadius } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{
      backgroundColor: 'rgba(22, 27, 34, 0.65)',
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
            backgroundColor: `${colors.primary}18`,
            flexShrink: 0
          }}>
            <Icon name="settings" size={11} color={colors.primary} />
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
            color: '#58a6ff',
            backgroundColor: 'rgba(56, 139, 253, 0.1)',
            padding: '2px 7px',
            borderRadius: 4,
            border: '1px solid rgba(56, 139, 253, 0.25)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
          }}>
            {options.maxContextTokens === 1000000 ? '1M' : options.maxContextTokens > 0 ? `${options.maxContextTokens / 1000}K` : 'No Limit'}
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
            backgroundColor: 'rgba(13, 17, 23, 0.6)',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: '700', color: colors.text }}>
                  Target LLM Context Limit
                </span>
                <span style={{ fontSize: 10, color: '#8b949e' }}>
                  (Chunking threshold)
                </span>
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
                  {options.maxContextTokens === 1000000
                    ? '1.0M tokens'
                    : options.maxContextTokens === 0
                      ? 'No Limit'
                      : `${Math.round(options.maxContextTokens / 1000)}k tokens`}
                </span>
                <span style={{
                  fontSize: 10.5,
                  color: options.maxContextTokens === 1000000 ? '#38bdf8' : '#3fb950',
                  fontWeight: '600'
                }}>
                  {options.maxContextTokens === 1000000
                    ? 'Gemini 1.5/2.0'
                    : options.maxContextTokens === 200000
                      ? 'Claude 3.5'
                      : options.maxContextTokens === 128000
                        ? 'GPT-4o'
                        : options.maxContextTokens === 32000
                          ? 'GPT-4'
                          : 'Custom'}
                </span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="4"
              step="1"
              className="context-slider"
              value={
                options.maxContextTokens === 32000
                  ? 0
                  : options.maxContextTokens === 128000
                    ? 1
                    : options.maxContextTokens === 200000
                      ? 2
                      : options.maxContextTokens === 1000000
                        ? 3
                        : 4
              }
              onChange={(e) => {
                const stepValues = [32000, 128000, 200000, 1000000, 0];
                const selectedVal = stepValues[Number(e.target.value)];
                updateOption('maxContextTokens', selectedVal);
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8b949e', marginTop: 2, padding: '0 2px' }}>
              {[
                { val: 32000, label: '32k' },
                { val: 128000, label: '128k' },
                { val: 200000, label: '200k' },
                { val: 1000000, label: '1M (Default)' },
                { val: 0, label: 'Auto' },
              ].map(item => {
                const isActive = options.maxContextTokens === item.val;
                return (
                  <span
                    key={item.val}
                    style={{
                      cursor: 'pointer',
                      color: isActive ? '#58a6ff' : '#8b949e',
                      fontWeight: isActive ? 700 : 500,
                      transition: 'color 0.12s ease'
                    }}
                    onClick={() => updateOption('maxContextTokens', item.val)}
                  >
                    {item.label}
                  </span>
                );
              })}
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
              backgroundColor: 'rgba(13, 17, 23, 0.4)',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
              <span style={{ fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: '#8b949e', marginBottom: 2 }}>
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
              backgroundColor: 'rgba(13, 17, 23, 0.4)',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: '#8b949e' }}>
                  Max File Limit
                </span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#c9d1d9', fontWeight: 600 }}>
                  {options.maxFileSize} KB
                </span>
              </div>
              <input
                type="number"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#0d1117',
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
              <span style={{ fontSize: 10.5, color: '#8b949e' }}>
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
