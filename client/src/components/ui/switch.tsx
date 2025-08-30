import React from 'react';

// Simple Switch placeholder
export function Switch({ checked = false, onChange, ...props }: { checked?: boolean; onChange?: (e: any) => void; [key: string]: any }) {
  return (
    <label style={{ display: 'inline-block', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} {...props} />
      <span style={{ display: 'inline-block', width: 40, height: 20, background: checked ? '#4f46e5' : '#ccc', borderRadius: 20, position: 'relative', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', left: checked ? 22 : 2, top: 2, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: 'left 0.2s' }} />
      </span>
    </label>
  );
}
