import React, { useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

interface BubbleInputProps {
  values?: string[];
  setValues: (val: string) => void;
}

const BubbleInput: React.FC<BubbleInputProps> = ({ values = [], setValues }) => {
  const { colors } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  const addValues = (raw: string) => {
    const incoming = raw
      .split(',')
      .map(s => s.trim().replace(/^,+|,+$/g, ''))
      .filter(Boolean);

    if (incoming.length === 0) return;

    const merged = Array.from(new Set([...values, ...incoming]));
    setValues(merged.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addValues(target.value);
      target.value = '';
    } else if (e.key === 'Backspace' && target.value === '' && values.length > 0) {
      const newValues = [...values];
      newValues.pop();
      setValues(newValues.join(', '));
    }
  };

  const removeValue = (indexToRemove: number) => {
    const newValues = values.filter((_, index) => index !== indexToRemove);
    setValues(newValues.join(', '));
  };

  return (
    <div
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '3px 6px',
        minHeight: 38,
        backgroundColor: '#0d1117',
        borderColor: colors.border,
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 6,
        display: 'flex',
        width: '100%',
        boxSizing: 'border-box'
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '4px',
            padding: '1px 6px',
            margin: '2px 3px',
            fontSize: '11px',
            color: '#c9d1d9',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
          }}
        >
          <span style={{ marginRight: 5, fontWeight: 500 }}>{value}</span>
          <button
            onClick={(e) => { e.stopPropagation(); removeValue(index); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1,
              fontSize: '10px'
            }}
            title="Remove pattern"
          >
            ✕
          </button>
        </div>
      ))}
      <input
        ref={inputRef}
        style={{
          flex: 1,
          minWidth: 80,
          padding: '4px 8px',
          color: colors.text,
          fontSize: 13,
          background: 'transparent',
          border: 'none',
          outline: 'none'
        }}
        placeholder={values.length === 0 ? "e.g. node_modules, .git, build" : ""}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
            addValues(e.target.value);
            e.target.value = '';
        }}
      />
    </div>
  );
};

export default BubbleInput;
