import React, { useState } from 'react';
import Icon from './Icon';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Is repointxt private and secure for proprietary codebases?",
    answer: "Yes. Unlike other tools that send your code through external backend proxies, repointxt runs 100% client-side in your browser memory. GitHub repositories are decompressed using in-memory JSZip, and local directories are parsed via the File System Access API. Zero code or credentials ever leave your machine."
  },
  {
    question: "How is repointxt different from repo2txt or gitingest?",
    answer: "repointxt provides active token budgeting (sliders for 32k, 128k, 200k, and 1M tokens), intelligent multi-part chunking for Claude and Gemini, automatic stripping of SVG paths, legal licenses, and build boilerplate, plus native presets for Turborepo, Next.js, and Flutter monorepos—all completely client-side without server retention."
  },
  {
    question: "How do I pack a GitHub repository for Claude 3.5 Sonnet or Gemini 1.5 Pro?",
    answer: "Simply enter your GitHub repository URL (or append /owner/repo to repointxt.corbit.tech), select your target context window (e.g. 200k for Claude or 1M for Gemini), select the files you want to include, and click Generate. repointxt will automatically create token-bounded XML prompt blocks ready to paste directly into your AI chat."
  }
];

interface FaqSectionProps {
  isDark?: boolean;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ isDark = true }) => {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set([0, 1, 2]));

  const toggleIndex = (index: number) => {
    setOpenIndexes(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <section
      aria-label="Frequently Asked Questions"
      style={{
        marginTop: 36,
        marginBottom: 16,
        padding: '20px 24px',
        borderRadius: 12,
        backgroundColor: isDark ? 'rgba(22, 27, 34, 0.4)' : '#f6f8fa',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{
          fontSize: 18,
          fontWeight: 700,
          margin: '0 0 6px 0',
          color: isDark ? '#f0f6fc' : '#1f2328',
          letterSpacing: '-0.3px',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>Frequently Asked Questions</span>
        </h2>
        <p style={{
          fontSize: 13,
          color: isDark ? '#8b949e' : '#57606a',
          margin: 0,
          lineHeight: 1.4
        }}>
          Learn how repointxt securely converts codebases into token-dense prompts for LLMs.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndexes.has(index);
          return (
            <div
              key={index}
              style={{
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(13, 17, 23, 0.7)' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`,
                overflow: 'hidden',
                transition: 'border-color 0.15s ease'
              }}
            >
              <button
                type="button"
                onClick={() => toggleIndex(index)}
                aria-expanded={isOpen}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: isDark ? '#f0f6fc' : '#1f2328',
                  gap: 12
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
                  {item.question}
                </span>
                <span style={{
                  color: isDark ? '#8b949e' : '#57606a',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}>
                  <Icon name="chevron-down" size={14} color="currentColor" />
                </span>
              </button>
              {isOpen && (
                <div style={{
                  padding: '0 16px 14px 16px',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: isDark ? '#c9d1d9' : '#424a53',
                  borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'}`,
                  paddingTop: 10
                }}>
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FaqSection;
