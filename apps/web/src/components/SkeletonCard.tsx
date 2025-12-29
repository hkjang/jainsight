'use client';

interface SkeletonCardProps {
    lines?: number;
}

export default function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="space-y-3">
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className="h-3 bg-gray-200 rounded"
                        style={{ width: `${100 - i * 15}%` }}
                    />
                ))}
            </div>
        </div>
    );
}
