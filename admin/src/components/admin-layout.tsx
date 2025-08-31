import React from 'react';

export default function AdminLayout({ currentPage, onPageChange, children }: any) {
  return (
    <div>
      <nav style={{ background: '#eee', padding: 10 }}>
        <span>Admin Layout - Current: {currentPage}</span>
        {/* Add navigation UI here */}
      </nav>
      <main>{children}</main>
    </div>
  );
}
