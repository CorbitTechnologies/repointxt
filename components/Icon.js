import React from 'react';
import { View, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import icons from '../assets/icons.json';

const Icon = ({ name, size = 20, color, style }) => {
  const { colors, isDark } = useTheme();
  const svgString = icons[name];
  
  if (!svgString) {
    console.warn(`Icon "${name}" not found in corbit-icons`);
    return null;
  }

  const iconColor = color || colors.text;

  // Robust SVG processing
  let processedSvg = svgString
    .replace(/width="[^"]*"/g, '')
    .replace(/height="[^"]*"/g, '')
    .replace(/currentColor/g, iconColor)
    .replace(/stroke-width="[^"]*"/g, 'stroke-width="2"');

  // Inject dimensions into the svg tag and ensure it fills the container
  processedSvg = processedSvg.replace(/<svg/i, `<svg width="100%" height="100%"`);

  if (Platform.OS === 'web') {
    // Standard web approach for SVG injection
    return (
      <div 
        style={{ 
          width: size, 
          height: size, 
          display: 'flex',
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0,
          ...style 
        }}
        dangerouslySetInnerHTML={{ __html: processedSvg }}
      />
    );
  }

  // Fallback for native
  return <View style={[{ width: size, height: size, backgroundColor: iconColor, opacity: 0.3 }, style]} />;
};

export default Icon;
