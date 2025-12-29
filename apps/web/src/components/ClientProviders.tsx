'use client';

import { GlobalKeyboardShortcuts } from './GlobalKeyboardShortcuts';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <GlobalKeyboardShortcuts />
        </>
    );
}
