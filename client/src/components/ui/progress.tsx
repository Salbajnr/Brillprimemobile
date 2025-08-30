import React from 'react';

// Simple Progress bar placeholder
export function Progress({ value = 0, max = 100, ...props }: { value?: number; max?: number; [key: string]: any }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ width: '100%', background: '#eee', borderRadius: 4, height: 16, ...props.style }}>
      <div style={{ width: percent + '%', background: '#4f46e5', height: '100%', borderRadius: 4 }} />
    </div>
  );
}
