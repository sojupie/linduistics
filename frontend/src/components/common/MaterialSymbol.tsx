import React from 'react';

export interface MaterialSymbolProps {
  icon: string;
  size?: number | string;
  className?: string;
  fill?: boolean;
  weight?: number;
  title?: string;
}

export const MaterialSymbol: React.FC<MaterialSymbolProps> = ({
  icon,
  size,
  className = '',
  fill = true, // Solid filled by default per spec
  weight = 400,
  title,
}) => {
  const style: React.CSSProperties = {
    fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
    ...(size !== undefined
      ? {
          fontSize: typeof size === 'number' ? `${size}px` : size,
          width: typeof size === 'number' ? `${size}px` : size,
          height: typeof size === 'number' ? `${size}px` : size,
        }
      : {}),
  };

  return (
    <span
      className={`material-symbols-outlined inline-flex items-center justify-center shrink-0 align-middle select-none leading-none ${className}`}
      style={style}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      aria-label={title}
      title={title}
    >
      {icon}
    </span>
  );
};
