'use client';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    // Login page has its own full-screen layout without sidebar
    return (
        <div style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 100,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        }}>
            {children}
        </div>
    );
}
