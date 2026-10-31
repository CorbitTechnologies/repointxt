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
    answer: "repointxt provides active token budgeting (sliders for 100K, 200K, 272K, 500K, and 1M tokens), intelligent multi-part chunking for Claude and Gemini, automatic stripping of SVG paths, legal licenses, and build boilerplate, plus native presets for Turborepo, Next.js, and Flutter monorepos—all completely client-side without server retention."
  },
  {
    question: "How do I pack a GitHub repository for Claude 5.5 or Gemini 4?",
    answer: "Simply enter your GitHub repository URL (or append /owner/repo to repointxt.corbit.tech), select your target context window (e.g. 200K for Claude, 1M for Gemini 4 / GPT-6), select the files you want to include, and click Generate. repointxt will automatically create token-bounded XML prompt blocks ready to paste directly into your AI chat."
  },
  {
    question: "Is there a 1-click Browser Bookmarklet to jump from GitHub to repointxt?",
    answer: "Yes! Drag this link to your bookmarks bar: javascript:window.open('https://repointxt.corbit.tech/'+location.pathname.replace(/^\\//,'')). Clicking it while viewing any GitHub repository instantly opens repointxt and scans that repository."
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

      {/* Visible comparison table: gives crawlers and AI answer engines a
          quotable, structured summary instead of prose they have to infer. */}
      <div style={{ marginTop: 22 }}>
        <h3 style={{
          fontSize: 15,
          fontWeight: 700,
          margin: '0 0 10px 0',
          color: isDark ? '#f0f6fc' : '#1f2328',
          letterSpacing: '-0.2px'
        }}>
          repointxt vs. gitingest vs. repo2txt
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12.5,
            lineHeight: 1.5,
            color: isDark ? '#c9d1d9' : '#424a53'
          }}>
            <caption style={{
              captionSide: 'bottom',
              textAlign: 'left',
              paddingTop: 8,
              fontSize: 11.5,
              color: isDark ? '#8b949e' : '#57606a'
            }}>
              Capability comparison for converting a repository into an LLM prompt.
            </caption>
            <thead>
              <tr>
                {['Capability', 'repointxt', 'gitingest', 'repo2txt'].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                      fontWeight: 700,
                      color: isDark ? '#f0f6fc' : '#1f2328',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Data path', 'Runs entirely in your browser', 'Hosted service fetches the repo server-side', 'Runs in your browser'],
                ['Token budgeting', 'Target context presets with automatic multi-part splitting', 'Token count is reported', 'Manual file selection'],
                ['Local folders / ZIP', 'Drop a folder, a ZIP, or paste a GitHub URL', 'Web UI or archive upload', 'GitHub URL'],
                ['Account required', 'No', 'No', 'No'],
                ['Price', 'Free', 'Free', 'Free'],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      style={{
                        padding: '8px 10px',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        verticalAlign: 'top',
                        fontWeight: cellIndex === 1 ? 600 : 400,
                        color: cellIndex === 1 ? (isDark ? '#58a6ff' : '#0969da') : undefined
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
