'use client';

import { useState, forwardRef } from 'react';

// Input Component with consistent styling
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: string;
    rightIcon?: string;
    onRightIconClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    icon,
    rightIcon,
    onRightIconClick,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div style={{ marginBottom: '16px' }}>
            {label && (
                <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: isFocused ? '#a5b4fc' : '#94a3b8',
                    transition: 'color 0.2s',
                }}>
                    {label}
                </label>
            )}
            <div style={{ position: 'relative' }}>
                {icon && (
                    <span style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '16px',
                        opacity: 0.6,
                    }}>
                        {icon}
                    </span>
                )}
                <input
                    ref={ref}
                    {...props}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    style={{
                        width: '100%',
                        padding: '14px 16px',
                        paddingLeft: icon ? '44px' : '16px',
                        paddingRight: rightIcon ? '44px' : '16px',
                        background: isFocused 
                            ? 'rgba(40, 37, 90, 0.8)' 
                            : 'rgba(30, 27, 75, 0.6)',
                        border: error 
                            ? '1px solid rgba(239, 68, 68, 0.5)'
                            : isFocused 
                                ? '1px solid rgba(99, 102, 241, 0.6)' 
                                : '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '12px',
                        color: '#e2e8f0',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isFocused 
                            ? '0 0 20px rgba(99, 102, 241, 0.15)' 
                            : 'none',
                        ...props.style,
                    }}
                />
                {rightIcon && (
                    <button
                        type="button"
                        onClick={onRightIconClick}
                        style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            opacity: 0.6,
                            padding: '4px',
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                    >
                        {rightIcon}
                    </button>
                )}
            </div>
            {error && (
                <p style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}>
                    <span>⚠</span> {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: Array<{ value: string; label: string }>;
    error?: string;
}

export function Select({ label, options, error, ...props }: SelectProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div style={{ marginBottom: '16px' }}>
            {label && (
                <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: isFocused ? '#a5b4fc' : '#94a3b8',
                    transition: 'color 0.2s',
                }}>
                    {label}
                </label>
            )}
            <select
                {...props}
                onFocus={(e) => {
                    setIsFocused(true);
                    props.onFocus?.(e);
                }}
                onBlur={(e) => {
                    setIsFocused(false);
                    props.onBlur?.(e);
                }}
                style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: isFocused 
                        ? 'rgba(40, 37, 90, 0.8)' 
                        : 'rgba(30, 27, 75, 0.6)',
                    border: error 
                        ? '1px solid rgba(239, 68, 68, 0.5)'
                        : isFocused 
                            ? '1px solid rgba(99, 102, 241, 0.6)' 
                            : '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '12px',
                    color: '#e2e8f0',
                    fontSize: '15px',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    ...props.style,
                }}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && (
                <p style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    color: '#ef4444',
                }}>
                    ⚠ {error}
                </p>
            )}
        </div>
    );
}

// Checkbox Component
export function Checkbox({
    label,
    checked,
    onChange,
    disabled = false,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
        }}>
            <div
                onClick={() => !disabled && onChange(!checked)}
                style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    background: checked 
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                        : 'rgba(30, 27, 75, 0.6)',
                    border: checked 
                        ? 'none' 
                        : '2px solid rgba(99, 102, 241, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                }}
            >
                {checked && (
                    <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>
                )}
            </div>
            <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                {label}
            </span>
        </label>
    );
}

// Toggle/Switch Component
export function Toggle({
    checked,
    onChange,
    label,
    disabled = false,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}) {
    return (
        <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
        }}>
            <div
                onClick={() => !disabled && onChange(!checked)}
                style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: checked 
                        ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' 
                        : 'rgba(99, 102, 241, 0.2)',
                    position: 'relative',
                    transition: 'background 0.2s ease',
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: checked ? '22px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s ease',
                }} />
            </div>
            {label && (
                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                    {label}
                </span>
            )}
        </label>
    );
}
