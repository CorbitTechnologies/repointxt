import React from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const Checkbox = ({ label, checked, onChange, disabled }) => {
  const { colors, isDark } = useTheme();

  return (
    <button
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '8px 0',
        opacity: disabled ? 0.5 : 1,
        background: 'none',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left'
      }}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <div style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: checked ? colors.primary : colors.border,
        borderStyle: 'solid',
        backgroundColor: checked ? colors.primary : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
      }}>
        {checked && <Icon name="check" size={12} color={isDark ? '#000' : '#fff'} />}
      </div>
      <span style={{
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
      }}>
        {label}
      </span>
    </button>
  );
};

export default Checkbox;
