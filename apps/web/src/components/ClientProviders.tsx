'use client';

import { GlobalKeyboardShortcuts } from './GlobalKeyboardShortcuts';
import { ToastProvider } from './Toast';
import CommandPalette from './CommandPalette';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            {children}
            <GlobalKeyboardShortcuts />
            <CommandPalette />
        </ToastProvider>
    );
}
