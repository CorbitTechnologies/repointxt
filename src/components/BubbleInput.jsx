import React, { useRef, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const BubbleInput = ({ values = [], setValues }) => {
  const { colors } = useTheme();
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = e.target.value.trim().replace(/^,+|,+$/g, '');
      if (val && !values.includes(val)) {
        setValues([...values, val].join(', '));
      }
      e.target.value = '';
    } else if (e.key === 'Backspace' && e.target.value === '' && values.length > 0) {
      const newValues = [...values];
      newValues.pop();
      setValues(newValues.join(', '));
    }
  };

  const removeValue = (indexToRemove) => {
    const newValues = values.filter((_, index) => index !== indexToRemove);
    setValues(newValues.join(', '));
  };

  return (
    <div
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: 4,
        minHeight: 44,
        backgroundColor: colors.surface,
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
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary,
            borderRadius: 12,
            padding: '4px 8px 4px 10px',
            margin: 2,
            display: 'flex'
          }}
        >
          <span style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginRight: 6 }}>
            {value}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); removeValue(index); }}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <Icon name="x" size={10} color="#fff" />
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
            const val = e.target.value.trim().replace(/^,+|,+$/g, '');
            if (val && !values.includes(val)) {
              setValues([...values, val].join(', '));
            }
            e.target.value = '';
        }}
      />
    </div>
  );
};

export default BubbleInput;
