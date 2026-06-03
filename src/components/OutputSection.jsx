import React, { useMemo, memo } from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const OutputSection = ({ output, tokenCount, onCopy, onDownload, isMobile }) => {
  const { colors, borderRadius, spacing, shadows, isDark } = useTheme();

  if (!output) return null;

  return (
    <div style={{ backgroundColor: colors.card, borderRadius: 12, padding: isMobile ? 12 : 20, display: 'flex', flexDirection: 'column', ...shadows.lg, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', marginBottom: spacing.md, gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, marginBottom: isMobile ? 12 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="content-copy" size={18} color={colors.text} />
              <span style={{ color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 }}>Bundle Output</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>CHARS:</span>
                <span style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{output.length.toLocaleString()}</span>
              </div>
              <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>EST. TOKENS:</span>
                <span style={{ color: colors.primary, fontSize: 13, fontWeight: '800' }}>~{tokenCount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignSelf: 'flex-start' }}>
            <button
              style={{
                backgroundColor: colors.primary,
                borderRadius: 6,
                padding: '10px 16px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                border: 'none',
                cursor: 'pointer',
                ...shadows.sm
              }}
              onClick={onCopy}
            >
              <Icon name="content-copy" size={16} color={isDark ? '#000' : '#fff'} />
              {!isMobile && <span style={{ color: isDark ? '#000' : '#fff', fontSize: 13, fontWeight: '700' }}>Copy All</span>}
            </button>
            <button
              style={{
                backgroundColor: colors.surface,
                borderRadius: 6,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'solid',
                cursor: 'pointer'
              }}
              onClick={onDownload}
            >
              <Icon name="download" size={16} color={colors.text} />
            </button>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'solid',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: 16, maxHeight: 400, overflowY: 'auto' }}>
          <pre style={{
            color: colors.text,
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: 'monospace',
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            {output}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default memo(OutputSection);
