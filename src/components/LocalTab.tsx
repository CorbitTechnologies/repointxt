import React from 'react';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const LocalTab: React.FC<any> = (props) => {
  const { colors, borderRadius, shadows, isDark } = useTheme();

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: props.isMobile ? 'column' : 'row', gap: 8 }}>
        <button
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: 'solid',
            padding: props.isMobile ? '10px 14px' : '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: props.loading ? 'default' : 'pointer',
            opacity: props.loading ? 0.7 : 1,
            ...shadows.sm
          }}
          onClick={() => props.pickLocalFiles(true)}
          disabled={props.loading}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="file" size={16} color={colors.text} />
            <span style={{ color: colors.text, fontSize: 13.5, fontWeight: '800', letterSpacing: 0.3 }}>Select Files</span>
          </div>
        </button>

        <button
          style={{
            flex: 1,
            backgroundColor: colors.primary,
            borderRadius: borderRadius.md,
            border: 'none',
            padding: props.isMobile ? '10px 14px' : '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: props.loading ? 'default' : 'pointer',
            opacity: props.loading ? 0.7 : 1,
            ...shadows.sm
          }}
          onClick={() => props.pickLocalDirectory(true)}
          disabled={props.loading}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="folder" size={16} color="#ffffff" />
            <span style={{ color: '#ffffff', fontSize: 13.5, fontWeight: '800', letterSpacing: 0.3 }}>Select Folder</span>
          </div>
        </button>
      </div>

      <div
        style={{
          width: '100%',
          marginTop: 4,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: props.isDragging ? colors.primary : colors.border,
          borderRadius: borderRadius.md,
          backgroundColor: props.isDragging ? (isDark ? 'rgba(0,112,243,0.1)' : 'rgba(0,112,243,0.05)') : colors.surface,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          pointerEvents: 'none',
          boxSizing: 'border-box'
        }}
      >
        <Icon name="upload" size={20} color={props.isDragging ? colors.text : colors.textPlaceholder} />
        <span style={{
          color: props.isDragging ? colors.text : colors.textPlaceholder,
          fontSize: 13,
          fontWeight: '600',
          textAlign: 'center'
        }}>
          {props.isDragging ? 'Drop files here to add' : 'Drag and drop files or folders here'}
        </span>
      </div>
    </div>
  );
};

export default LocalTab;
