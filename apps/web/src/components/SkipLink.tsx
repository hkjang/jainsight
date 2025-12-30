'use client';

export function SkipLink() {
    return (
        <a
            href="#main-content"
            style={{
                position: 'absolute',
                left: '-9999px',
                top: 'auto',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
            }}
            onFocus={(e) => {
                e.currentTarget.style.left = '16px';
                e.currentTarget.style.top = '16px';
                e.currentTarget.style.width = 'auto';
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.padding = '12px 24px';
                e.currentTarget.style.background = 'linear-gradient(90deg, #6366f1, #8b5cf6)';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.borderRadius = '8px';
                e.currentTarget.style.zIndex = '99999';
                e.currentTarget.style.textDecoration = 'none';
                e.currentTarget.style.fontWeight = '600';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
            }}
            onBlur={(e) => {
                e.currentTarget.style.left = '-9999px';
                e.currentTarget.style.width = '1px';
                e.currentTarget.style.height = '1px';
            }}
        >
            메인 콘텐츠로 건너뛰기
        </a>
    );
}
