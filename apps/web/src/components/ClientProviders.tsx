'use client';

import { GlobalKeyboardShortcuts } from './GlobalKeyboardShortcuts';
import { ToastProvider } from './Toast';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            {children}
            <GlobalKeyboardShortcuts />
        </ToastProvider>
    );
}
