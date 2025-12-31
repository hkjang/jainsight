'use client';

import UserMenu from './UserMenu';

export function Header() {
    return (
        <header style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '12px 24px',
            background: 'rgba(15, 23, 42, 0.5)',
            borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
            gap: '16px'
        }}>
            <UserMenu />
        </header>
    );
}

export default Header;
