import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, MapPin, Users, DoorOpen, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuildingCardData {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  total: number;
  occupied: number;
  available: number;
  maintenance: number;
  occupancyRate: number;
}

interface BuildingSelectorCardsProps {
  buildings: BuildingCardData[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function BuildingSelectorCards({ buildings, selectedId, onSelect }: BuildingSelectorCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {/* "All" card */}
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md border-2',
          selectedId === 'all'
            ? 'border-primary bg-primary/5 shadow-md'
            : 'border-transparent hover:border-border'
        )}
        onClick={() => onSelect('all')}
      >
        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
          <div className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center',
            selectedId === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            <Building2 className="h-5 w-5" />
          </div>
          <span className="font-medium text-sm">
            {t('admin.backoffice.allBuildings', 'All Buildings')}
          </span>
          <span className="text-xs text-muted-foreground">
            {buildings.reduce((sum, b) => sum + b.total, 0)} {t('admin.backoffice.rooms', 'rooms')}
          </span>
        </CardContent>
      </Card>

      {buildings.map(building => {
        const isSelected = selectedId === building.id;
        const rateColor = building.occupancyRate > 80
          ? 'text-primary'
          : building.occupancyRate > 50
            ? 'text-foreground'
            : 'text-muted-foreground';

        return (
          <Card
            key={building.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border-2',
              isSelected
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-transparent hover:border-border'
            )}
            onClick={() => onSelect(building.id)}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {building.code.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>

              <div>
                <h4 className="font-medium text-sm leading-tight line-clamp-1">{building.name}</h4>
                {building.city && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                    <MapPin className="h-2.5 w-2.5" />
                    {building.city}
                  </p>
                )}
              </div>

              <Progress value={building.occupancyRate} className="h-1.5" />

              <div className="flex items-center justify-between text-[10px]">
                <span className={cn('font-bold text-sm', rateColor)}>
                  {building.occupancyRate}%
                </span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Users className="h-2.5 w-2.5" />
                    {building.occupied}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <DoorOpen className="h-2.5 w-2.5" />
                    {building.available}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
