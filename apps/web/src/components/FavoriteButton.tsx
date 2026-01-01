'use client';

import { useState, useEffect, useCallback } from 'react';
import useAuth from '../hooks/useAuth';

export type FavoriteType = 'query' | 'report' | 'connection' | 'dashboard';

interface UseFavoriteOptions {
    itemType: FavoriteType;
    itemId: string;
    name?: string;
    description?: string;
}

interface UseFavoriteReturn {
    isFavorite: boolean;
    loading: boolean;
    toggle: () => Promise<void>;
    add: () => Promise<void>;
    remove: () => Promise<void>;
}

/**
 * Hook to manage favorite status for an item
 */
export function useFavorite({ itemType, itemId, name, description }: UseFavoriteOptions): UseFavoriteReturn {
    const { user, token, isAuthenticated } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(true);

    const checkStatus = useCallback(async () => {
        if (!user?.id || !token || !itemId) {
            setLoading(false);
            return;
        }
        
        try {
            const res = await fetch(`/api/users/${user.id}/favorites/${itemType}/${itemId}/check`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIsFavorite(data.isFavorite);
            }
        } catch (e) {
            console.error('Failed to check favorite status', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id, token, itemType, itemId]);

    useEffect(() => {
        if (isAuthenticated && itemId) {
            checkStatus();
        }
    }, [checkStatus, isAuthenticated, itemId]);

    const add = useCallback(async () => {
        if (!user?.id || !token) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/users/${user.id}/favorites`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ itemType, itemId, name, description })
            });
            if (res.ok) {
                setIsFavorite(true);
            }
        } catch (e) {
            console.error('Failed to add favorite', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id, token, itemType, itemId, name, description]);

    const remove = useCallback(async () => {
        if (!user?.id || !token) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/users/${user.id}/favorites/${itemType}/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok || res.status === 204) {
                setIsFavorite(false);
            }
        } catch (e) {
            console.error('Failed to remove favorite', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id, token, itemType, itemId]);

    const toggle = useCallback(async () => {
        if (isFavorite) {
            await remove();
        } else {
            await add();
        }
    }, [isFavorite, add, remove]);

    return { isFavorite, loading, toggle, add, remove };
}

// ============================================================================
// FAVORITE BUTTON COMPONENT
// ============================================================================

interface FavoriteButtonProps {
    itemType: FavoriteType;
    itemId: string;
    name?: string;
    description?: string;
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
    onToggle?: (isFavorite: boolean) => void;
    style?: React.CSSProperties;
}

export function FavoriteButton({ 
    itemType, 
    itemId, 
    name, 
    description, 
    size = 'medium', 
    showLabel = false,
    onToggle,
    style 
}: FavoriteButtonProps) {
    const { isFavorite, loading, toggle } = useFavorite({ itemType, itemId, name, description });
    
    const sizeStyles = {
        small: { padding: '4px 8px', fontSize: '12px', iconSize: '14px' },
        medium: { padding: '6px 12px', fontSize: '14px', iconSize: '18px' },
        large: { padding: '8px 16px', fontSize: '16px', iconSize: '22px' }
    };

    const s = sizeStyles[size];

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await toggle();
        onToggle?.(!isFavorite);
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: s.padding,
                fontSize: s.fontSize,
                background: isFavorite 
                    ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.15))'
                    : 'rgba(99, 102, 241, 0.1)',
                border: `1px solid ${isFavorite ? 'rgba(251, 191, 36, 0.4)' : 'rgba(99, 102, 241, 0.2)'}`,
                borderRadius: '8px',
                color: isFavorite ? '#fbbf24' : '#94a3b8',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1,
                ...style
            }}
            onMouseEnter={(e) => {
                if (!loading) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
            }}
        >
            <span style={{ fontSize: s.iconSize, transition: 'transform 0.2s' }}>
                {isFavorite ? '⭐' : '☆'}
            </span>
            {showLabel && (
                <span>{isFavorite ? '즐겨찾기됨' : '즐겨찾기'}</span>
            )}
        </button>
    );
}

// ============================================================================
// FAVORITE ICON (Compact version)
// ============================================================================

interface FavoriteIconProps {
    itemType: FavoriteType;
    itemId: string;
    name?: string;
    size?: number;
}

export function FavoriteIcon({ itemType, itemId, name, size = 20 }: FavoriteIconProps) {
    const { isFavorite, loading, toggle } = useFavorite({ itemType, itemId, name });

    return (
        <span
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!loading) toggle();
            }}
            title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            style={{
                cursor: loading ? 'wait' : 'pointer',
                fontSize: `${size}px`,
                opacity: loading ? 0.5 : 1,
                transition: 'transform 0.2s, opacity 0.2s',
                display: 'inline-block',
            }}
            onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
            }}
        >
            {isFavorite ? '⭐' : '☆'}
        </span>
    );
}

// Export types
export type { UseFavoriteReturn, FavoriteButtonProps, FavoriteIconProps };
