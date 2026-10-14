import React from 'react';
import { trackCompanyOutbound } from '../services/firebase';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showTagline = false }) => {
  const iconSizes = { sm: 26, md: 34, lg: 44 };
  const fontSizes = { sm: 17, md: 22, lg: 28 };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.15, userSelect: 'none' }}>
      <span style={{
          fontSize: fontSizes[size],
          fontWeight: 900,
          letterSpacing: '-0.8px',
          color: '#f0f6fc',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          repoin<span style={{ color: '#38bdf8' }}>t</span>xt
        </span>

        <a
          href="https://www.corbittechnologies.com/?utm_source=repointxt&utm_medium=logo&utm_campaign=app_nav"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackCompanyOutbound('header_brand')}
          style={{
            fontSize: size === 'sm' ? '10px' : '11px',
            fontWeight: 600,
            letterSpacing: '0.3px',
            color: '#8b949e',
            marginTop: 1,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8b949e')}
          title="Visit Corbit Technologies"
        >
          <span>by corbit technologies</span>
          <span style={{ fontSize: '9px', opacity: 0.8 }}>↗</span>
        </a>

        {showTagline && (
          <span style={{ fontSize: '11px', color: '#8b949e', marginTop: 4, fontWeight: 500 }}>
            Codebase context packer for AI engineers
          </span>
        )}
    </div>
  );
};

export default BrandLogo;
