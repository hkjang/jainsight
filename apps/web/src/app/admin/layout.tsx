'use client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    // Admin layout now just passes children through
    // Sidebar is handled by the root layout with role-based menu items
    return (
        <div style={{
            minHeight: '100%',
            padding: '24px',
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {children}
            </div>
        </div>
    );
}
