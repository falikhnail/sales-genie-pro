import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';

interface MobileCardListProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => ReactNode;
  renderTable: () => ReactNode;
  emptyState?: ReactNode;
}

export function MobileCardList<T>({ data, renderCard, renderTable, emptyState }: MobileCardListProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((item, index) => renderCard(item, index))}
      </div>
    );
  }

  return <>{renderTable()}</>;
}
