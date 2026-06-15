'use client';

import { cn } from '@/lib/utils';

interface MonitoringMarqueeProps {
  priority: 'hijau' | 'kuning' | 'merah';
  message: string;
}

const priorityStyles: Record<'hijau' | 'kuning' | 'merah', string> = {
  hijau: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  kuning: 'bg-amber-50 border-amber-300 text-amber-800',
  merah: 'bg-red-50 border-red-300 text-red-800',
};

const priorityIcons: Record<'hijau' | 'kuning' | 'merah', string> = {
  hijau: '🩺',
  kuning: '⚠️',
  merah: '🔴',
};

export function MonitoringMarquee({ priority, message }: MonitoringMarqueeProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 overflow-hidden border rounded-md px-4 py-2',
        priorityStyles[priority]
      )}
    >
      {/* Left gradient fade */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none',
          priority === 'hijau' && 'bg-gradient-to-r from-emerald-50 to-transparent',
          priority === 'kuning' && 'bg-gradient-to-r from-amber-50 to-transparent',
          priority === 'merah' && 'bg-gradient-to-r from-red-50 to-transparent'
        )}
      />
      {/* Right gradient fade */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none',
          priority === 'hijau' && 'bg-gradient-to-l from-emerald-50 to-transparent',
          priority === 'kuning' && 'bg-gradient-to-l from-amber-50 to-transparent',
          priority === 'merah' && 'bg-gradient-to-l from-red-50 to-transparent'
        )}
      />

      {/* Marquee content */}
      <div className="marquee-container group">
        <div className="marquee-content group-hover:[animation-play-state:paused]">
          <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium">
            <span>{priorityIcons[priority]}</span>
            <span>{message}</span>
            <span className="mx-8">•</span>
            <span>{priorityIcons[priority]}</span>
            <span>{message}</span>
            <span className="mx-8">•</span>
            <span>{priorityIcons[priority]}</span>
            <span>{message}</span>
            <span className="mx-8">•</span>
          </span>
        </div>
      </div>

      <style jsx>{`
        .marquee-container {
          overflow: hidden;
          width: 100%;
        }
        .marquee-content {
          display: inline-block;
          white-space: nowrap;
          animation: marquee-scroll 20s linear infinite;
        }
        @keyframes marquee-scroll {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}
