import React from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

interface CheckboxProps {
  label?: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, checked, indeterminate, onChange, disabled }) => {
  const { colors, isDark } = useTheme();

  return (
    <button
      type="button"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: label ? '8px 0' : 0,
        opacity: disabled ? 0.5 : 1,
        background: 'none',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left'
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      disabled={disabled}
    >
      <div style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: checked || indeterminate ? colors.primary : colors.border,
        borderStyle: 'solid',
        backgroundColor: checked || indeterminate ? colors.primary : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: label ? 10 : 0,
        flexShrink: 0
      }}>
        {checked && <Icon name="check" size={11} color={isDark ? '#000' : '#fff'} />}
        {!checked && indeterminate && <Icon name="minus" size={11} color={isDark ? '#000' : '#fff'} />}
      </div>
      {label && (
        <span style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.text,
        }}>
          {label}
        </span>
      )}
    </button>
  );
};

export default Checkbox;
