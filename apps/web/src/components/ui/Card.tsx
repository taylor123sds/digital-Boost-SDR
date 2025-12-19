import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'glass-card p-6 rounded-xl',
        hover && 'transition-all hover:border-cyan/30 hover:shadow-lg hover:shadow-cyan/5 cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; positive: boolean };
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ title, value, change, icon, className }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {change && (
            <p
              className={cn(
                'text-sm mt-2',
                change.positive ? 'text-green-400' : 'text-red-400'
              )}
            >
              {change.positive ? '+' : ''}{change.value}% vs semana anterior
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan/20 to-violet/20">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
