import React, { memo, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const OutputSection = ({ outputBatches, activeBatchIndex, setActiveBatchIndex, isMobile }) => {
  const { colors, borderRadius, shadows } = useTheme();
  const [copied, setCopied] = useState(false);

  if (!outputBatches || outputBatches.length === 0) return null;

  const currentBatch = outputBatches[activeBatchIndex];
  if (!currentBatch) return null;

  const copyCurrentBatch = async () => {
    try {
      await navigator.clipboard.writeText(currentBatch.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert('Failed to copy to clipboard');
    }
  };

  const downloadCurrentBatch = () => {
    const blob = new Blob([currentBatch.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repointxt_part_${currentBatch.part}_of_${currentBatch.totalParts}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: isMobile ? 16 : 24, border: `1px solid ${colors.border}`, ...shadows.md }}>

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primary + '20' }}>
              <Icon name="content-copy" size={16} color={colors.primary} />
            </div>
            <span style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
              Generated Prompt Bundle {currentBatch.totalParts > 1 ? `(Part ${currentBatch.part} of ${currentBatch.totalParts})` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, alignItems: 'center' }}>
            <span style={{ color: colors.textSecondary }}>Size: <strong style={{ color: colors.text }}>{(currentBatch.charCount / 1024).toFixed(1)} KB</strong></span>
            <span style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
              Est. Tokens: <strong style={{ color: colors.secondary, backgroundColor: colors.secondary + '18', padding: '2px 8px', borderRadius: 6, border: `1px solid ${colors.secondary}30` }}>~{currentBatch.tokenCount.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              backgroundColor: copied ? colors.secondary : colors.primary,
              color: '#ffffff', padding: '10px 18px', borderRadius: borderRadius.md, border: 'none',
              fontWeight: '800', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(0, 85, 255, 0.25)'
            }}
            onClick={copyCurrentBatch}
          >
            <Icon name={copied ? "check" : "content-copy"} size={14} color="#ffffff" />
            <span>{copied ? 'Copied to Clipboard!' : `Copy Part ${currentBatch.part}`}</span>
          </button>
          <button
            style={{
              backgroundColor: colors.surface, color: colors.text, padding: '10px 16px', borderRadius: borderRadius.md,
              border: `1px solid ${colors.border}`, fontWeight: '700', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease'
            }}
            onClick={downloadCurrentBatch}
          >
            <Icon name="download" size={14} color={colors.text} />
            <span>Download .txt</span>
          </button>
        </div>
      </div>

      {/* Batch Tabs if multi-part */}
      {outputBatches.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {outputBatches.map((b, idx) => (
            <button
              key={idx}
              onClick={() => setActiveBatchIndex(idx)}
              style={{
                padding: '8px 16px', borderRadius: borderRadius.md, fontSize: 12, fontWeight: '700', cursor: 'pointer',
                backgroundColor: activeBatchIndex === idx ? colors.primary : colors.surface,
                color: activeBatchIndex === idx ? '#ffffff' : colors.text,
                border: `1px solid ${activeBatchIndex === idx ? colors.primary : colors.border}`,
                transition: 'all 0.15s ease'
              }}
            >
              Part {b.part} ({Math.round(b.tokenCount / 1000)}k tokens)
            </button>
          ))}
        </div>
      )}

      {/* Code Text Area */}
      <div style={{ backgroundColor: colors.background, borderRadius: borderRadius.lg, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <div style={{ padding: 16, maxHeight: 460, overflowY: 'auto' }}>
          <pre style={{ margin: 0, fontSize: 12.5, fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', lineHeight: 1.6, color: colors.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {currentBatch.text}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default memo(OutputSection);