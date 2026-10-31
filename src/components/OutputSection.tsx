// src/components/OutputSection.tsx
import React, { memo, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';
import { trackEvent } from '../services/telemetry';

interface OutputSectionProps {
  outputBatches: any[];
  activeBatchIndex: number;
  setActiveBatchIndex: (index: number) => void;
  onClearOutput?: () => void;
  isMobile?: boolean;
}

// ── BRAND SVG ICONS ──
const BrandIcons = {
  AIStudio: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.5 2C9.5 6.142 6.142 9.5 2 9.5c4.142 0 7.5 3.358 7.5 7.5 0-4.142 3.358-7.5 7.5-7.5-4.142 0-7.5-3.358-7.5-7.5ZM18 14c0 2.209-1.791 4-4 4 2.209 0 4 1.791 4 4 0-2.209 1.791-4 4-4-2.209 0-4-1.791-4-4Z" />
    </svg>
  ),
  Gemini: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12Z" />
    </svg>
  ),
  Claude: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.8 2.2c-.5-.3-1.1-.3-1.6 0L9.8 3.7c-.5.3-.8.8-.8 1.4v2.7L6.6 6.3c-.5-.3-1.1-.2-1.5.1L3.3 7.8c-.4.3-.6.8-.5 1.4.1.5.4.9.9 1.1l2.5 1.1-2.5 1.1c-.5.2-.8.6-.9 1.1-.1.6.1 1.1.5 1.4l1.8 1.4c.4.3 1 .4 1.5.1l2.4-1.5v2.7c0 .6.3 1.1.8 1.4l2.4 1.5c.5.3 1.1.3 1.6 0l2.4-1.5c.5-.3.8-.8.8-1.4v-2.7l2.4 1.5c.5.3 1.1.2 1.5-.1l1.8-1.4c.4-.3.6-.8.5-1.4-.1-.5-.4-.9-.9-1.1l-2.5-1.1 2.5-1.1c.5-.2.8-.6.9-1.1.1-.6-.1-1.1-.5-1.4l-1.8-1.4c-.4-.3-1-.4-1.5-.1l-2.4 1.5V5.1c0-.6-.3-1.1-.8-1.4L13.8 2.2z" />
    </svg>
  ),
  ChatGPT: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9 6.07 6.07 0 0 0-10.27 2.17 5.98 5.98 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.51 2.9A6.06 6.06 0 0 0 14.5 24a6.06 6.06 0 0 0 5.77-4.21 5.99 5.99 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07zm-9.02 12.61a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.8.8 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.59a4.5 4.5 0 0 1-4.49 4.49zm-9.66-4.13a4.47 4.47 0 0 1-.53-3.01l.14.08 4.78 2.76a.77.77 0 0 0 .78 0l5.85-3.37v2.33a.08.08 0 0 1-.03.06L9.74 19.95a4.5 4.5 0 0 1-6.14-1.65zM2.34 7.9a4.48 4.48 0 0 1 2.37-1.98v5.68a.77.77 0 0 0 .39.68l5.81 3.35-2.02 1.17a.08.08 0 0 1-.07 0l-4.83-2.79A4.5 4.5 0 0 1 2.34 7.9zm16.1 3.85-5.84-3.37 2.02-1.17a.08.08 0 0 1 .07 0l4.83 2.79a4.5 4.5 0 0 1-.68 8.1v-5.67a.8.8 0 0 0-.4-.68zm2.01-3.02-.14-.08-4.78-2.79a.78.78 0 0 0-.78 0L9.41 9.23V6.9a.07.07 0 0 1 .03-.06l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66zM8.31 12.86l-2.02-1.16a.08.08 0 0 1-.04-.06V6.07a4.5 4.5 0 0 1 7.38-3.45l-.14.08-4.78 2.76a.8.8 0 0 0-.4.68zm1.1-2.36 2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5z" />
    </svg>
  ),
};

const formatTime = (ms?: number): string => {
  if (!ms && ms !== 0) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const OutputSection: React.FC<OutputSectionProps> = ({
  outputBatches,
  activeBatchIndex,
  setActiveBatchIndex,
  onClearOutput,
  isMobile,
}) => {
  const { colors, borderRadius, shadows } = useTheme();
  const [copied, setCopied] = useState(false);
  const [activeModelToast, setActiveModelToast] = useState<string | null>(null);

  if (!outputBatches || outputBatches.length === 0) return null;

  const currentBatch = outputBatches[activeBatchIndex];
  if (!currentBatch) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentBatch.text);
      setCopied(true);
      trackEvent('copy_prompt_clicked', {
        part: currentBatch.part,
        totalParts: currentBatch.totalParts,
        tokens: currentBatch.tokenCount,
      });
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      window.alert('Failed to copy to clipboard');
      return false;
    }
  };

  const downloadBatch = () => {
    const blob = new Blob([currentBatch.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repointxt_part_${currentBatch.part}_of_${currentBatch.totalParts}.txt`;
    a.click();
    trackEvent('download_prompt_clicked', {
      part: currentBatch.part,
      totalParts: currentBatch.totalParts,
      tokens: currentBatch.tokenCount,
    });
    URL.revokeObjectURL(url);
  };

  const launchAI = async (modelName: string, url: string) => {
    const ok = await copyToClipboard();
    if (ok) {
      setActiveModelToast(modelName);
      setTimeout(() => setActiveModelToast(null), 4000);
      window.open(url, '_blank', 'noopener,noreferrer');
      trackEvent('launch_ai_model', { model: modelName, tokens: currentBatch.tokenCount });
    }
  };

  const isHugeContext = currentBatch.tokenCount > 200000;

  return (
    <div
      id="output-section"
      className="output-card-glow"
      style={{
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: isMobile ? '12px 14px' : '15px 18px',
        border: `1px solid ${colors.border}`,
        ...shadows.md,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
      }}
    >
      {/* ── HEADER ROW: TITLE & METRICS ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                backgroundColor: 'rgba(56, 139, 253, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="copy" size={14} color="#58a6ff" />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: colors.text, letterSpacing: '-0.3px' }}>
              Prompt Bundle {currentBatch.totalParts > 1 ? `(${currentBatch.part}/${currentBatch.totalParts})` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: '#8b949e' }}>
            <span>{(currentBatch.charCount / 1024).toFixed(1)} KB</span>
            <span>•</span>
            <span
              style={{
                color: isHugeContext ? '#38bdf8' : '#3fb950',
                backgroundColor: isHugeContext ? 'rgba(56, 189, 248, 0.12)' : 'rgba(35, 134, 54, 0.15)',
                border: `1px solid ${isHugeContext ? 'rgba(56, 189, 248, 0.3)' : 'rgba(35, 134, 54, 0.35)'}`,
                padding: '1px 7px',
                borderRadius: 4,
                fontWeight: 700,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              ~{currentBatch.tokenCount.toLocaleString()} tokens
            </span>
            {currentBatch.elapsedMs && (
              <>
                <span>•</span>
                <span
                  style={{
                    color: '#e3b341',
                    fontWeight: 600,
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  ⚡ {formatTime(currentBatch.elapsedMs)}
                </span>
              </>
            )}
            {Boolean(currentBatch.redactedSecretsCount && currentBatch.redactedSecretsCount > 0) && (
              <>
                <span>•</span>
                <span
                  style={{
                    color: '#f85149',
                    backgroundColor: 'rgba(248, 81, 73, 0.12)',
                    border: '1px solid rgba(248, 81, 73, 0.3)',
                    padding: '1px 7px',
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title={`${currentBatch.redactedSecretsCount} detected API key(s) or private credentials were automatically redacted to [REDACTED_API_KEY]`}
                >
                  <Icon name="shield-check" size={12} color="#f85149" />
                  <span>{currentBatch.redactedSecretsCount} secret{currentBatch.redactedSecretsCount > 1 ? 's' : ''} redacted</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Primary Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: isMobile ? 'flex-end' : 'auto', flexWrap: 'wrap' }}>
          <button
            onClick={copyToClipboard}
            className="btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: copied ? '#238636' : '#1f6feb',
              borderRadius: '5px',
              gap: 5,
            }}
          >
            <Icon name={copied ? 'check' : 'copy'} size={13} color="#fff" />
            <span>{copied ? 'Copied!' : `Copy Part ${currentBatch.part}`}</span>
          </button>

          <button
            onClick={downloadBatch}
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '5px', gap: 4 }}
            title="Download prompt as .txt"
          >
            <Icon name="download" size={13} color="#8b949e" />
            <span>.txt</span>
          </button>

          <button
            onClick={() => {
              const badgeMarkdown = `[![Prompt with repointxt](https://img.shields.io/badge/Prompt_Context-repointxt-1f6feb?logo=github)](https://repointxt.corbit.tech)`;
              navigator.clipboard.writeText(badgeMarkdown);
              window.alert('Copied README badge markdown to clipboard!\n\n' + badgeMarkdown);
            }}
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '5px', gap: 4 }}
            title="Copy Markdown badge snippet for project README"
          >
            <Icon name="tag" size={13} color="#8b949e" />
            <span>Badge</span>
          </button>

          {onClearOutput && (
            <button
              onClick={onClearOutput}
              style={{
                background: 'none',
                border: 'none',
                color: '#8b949e',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Dismiss output"
            >
              <Icon name="x" size={14} color="#8b949e" />
            </button>
          )}
        </div>
      </div>

      {/* ── AI LAUNCHER ROW (WITH BRAND ICONS) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: 'rgba(13, 17, 23, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '6px',
          padding: isMobile ? '6px 8px' : '4px 8px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, marginRight: 2, width: isMobile ? '100%' : 'auto' }}>
          Launch in:
        </span>

        {/* Claude 5.5 (1M) */}
        <button
          onClick={() => launchAI('Claude 5.5', 'https://claude.ai/new')}
          style={{
            background: 'rgba(217, 119, 6, 0.08)',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            color: '#fbbf24',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
          title="Open in Claude 5.5 (Supports 1M tokens)"
        >
          <BrandIcons.Claude />
          <span>Claude 5.5 (1M)</span>
        </button>

        {/* GPT-6 (1.05M) */}
        <button
          onClick={() => launchAI('ChatGPT (GPT-6)', 'https://chatgpt.com/')}
          style={{
            background: 'rgba(16, 163, 127, 0.08)',
            border: '1px solid rgba(16, 163, 127, 0.25)',
            color: '#34d399',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
          title="Open in ChatGPT (GPT-6 Astra supports 1.05M tokens)"
        >
          <BrandIcons.ChatGPT />
          <span>GPT-6 (1M)</span>
        </button>

        {/* Gemini 4 (1M) */}
        <button
          onClick={() => launchAI('Gemini 4', 'https://gemini.google.com/app')}
          style={{
            background: 'rgba(66, 133, 244, 0.12)',
            border: '1px solid rgba(66, 133, 244, 0.35)',
            color: '#70a5ff',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
          title="Open in Gemini 4 Argon (1M tokens)"
        >
          <BrandIcons.Gemini />
          <span>Gemini 4 (1M)</span>
        </button>

        {/* Google AI Studio */}
        <button
          onClick={() => launchAI('Google AI Studio', 'https://aistudio.google.com/prompts/new_chat')}
          style={{
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#38bdf8',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
          title="Google AI Studio (Gemini 4 Argon)"
        >
          <BrandIcons.AIStudio />
          <span>AI Studio (1M)</span>
        </button>
      </div>

      {/* Multi-part batch selector if split */}
      {outputBatches.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {outputBatches.map((b, idx) => (
            <button
              key={idx}
              onClick={() => setActiveBatchIndex(idx)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: activeBatchIndex === idx ? '#1f6feb' : 'var(--bg-surface)',
                color: activeBatchIndex === idx ? '#ffffff' : '#c9d1d9',
                border: `1px solid ${activeBatchIndex === idx ? '#388bfd' : 'var(--border)'}`,
              }}
            >
              Part {b.part} ({Math.round(b.tokenCount / 1000)}k)
            </button>
          ))}
        </div>
      )}

      {/* Model Launch Toast */}
      {activeModelToast && (
        <div
          style={{
            padding: '6px 12px',
            borderRadius: '5px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38bdf8',
            fontSize: '11.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="check" size={13} color="#38bdf8" />
          <span>Copied! Opening {activeModelToast} — press ⌘V / Ctrl+V to paste.</span>
        </div>
      )}

      {/* Code Viewer Panel */}
      <div
        style={{
          backgroundColor: '#090d13',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: isMobile ? '10px' : '12px 14px', maxHeight: isMobile ? 260 : 420, overflowY: 'auto' }}>
          <pre
            style={{
              margin: 0,
              fontSize: isMobile ? '11px' : '12px',
              fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
              lineHeight: 1.55,
              color: '#f0f6fc',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {currentBatch.text}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default memo(OutputSection);
