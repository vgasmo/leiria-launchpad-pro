import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, Users, DoorOpen, Wrench } from 'lucide-react';
import { useBuildings, useRoomsWithAllocations, useOfficeSpaces } from '@/hooks/useBackoffice';
import { cn } from '@/lib/utils';

interface OccupancyStats {
  total: number;
  occupied: number;
  available: number;
  maintenance: number;
  occupancyRate: number;
}

function calculateStats(rooms: { status: string; current_allocation?: unknown | null }[]): OccupancyStats {
  const total = rooms.length;
  const occupied = rooms.filter(r => r.current_allocation).length;
  const maintenance = rooms.filter(r => r.status === 'maintenance').length;
  const available = rooms.filter(r => !r.current_allocation && r.status === 'available').length;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  
  return { total, occupied, available, maintenance, occupancyRate };
}

export function BuildingOccupancyPanel() {
  const { t } = useTranslation();
  const { data: buildings, isLoading: loadingBuildings } = useBuildings();
  const { data: spaces } = useOfficeSpaces();
  const { data: rooms, isLoading: loadingRooms } = useRoomsWithAllocations();

  if (loadingBuildings || loadingRooms) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('admin.backoffice.buildingOccupancy', 'Building Occupancy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group rooms by building (via space)
  const roomsByBuilding = new Map<string, typeof rooms>();
  
  rooms?.forEach(room => {
    const space = spaces?.find(s => s.id === room.space_id);
    const buildingId = (space as any)?.building_id || 'unknown';
    if (!roomsByBuilding.has(buildingId)) {
      roomsByBuilding.set(buildingId, []);
    }
    roomsByBuilding.get(buildingId)!.push(room);
  });

  // Calculate overall stats
  const overallStats = calculateStats(rooms || []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {t('admin.backoffice.buildingOccupancy', 'Building Occupancy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{overallStats.total}</div>
            <div className="text-xs text-muted-foreground">{t('admin.backoffice.totalRooms', 'Total Rooms')}</div>
          </div>
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{overallStats.occupied}</div>
            <div className="text-xs text-muted-foreground">{t('admin.backoffice.occupied', 'Occupied')}</div>
          </div>
          <div className="text-center p-3 bg-accent rounded-lg">
            <div className="text-2xl font-bold text-accent-foreground">{overallStats.available}</div>
            <div className="text-xs text-muted-foreground">{t('admin.backoffice.available', 'Available')}</div>
          </div>
          <div className="text-center p-3 bg-secondary rounded-lg">
            <div className="text-2xl font-bold text-secondary-foreground">{overallStats.maintenance}</div>
            <div className="text-xs text-muted-foreground">{t('admin.backoffice.maintenance', 'Maintenance')}</div>
          </div>
        </div>

        {/* Per Building Breakdown */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('admin.backoffice.byBuilding', 'By Building')}
          </h4>
          
          {buildings?.map(building => {
            const buildingRooms = roomsByBuilding.get(building.id) || [];
            const stats = calculateStats(buildingRooms);
            
            if (stats.total === 0) return null;

            return (
              <div key={building.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{building.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {building.code}
                    </Badge>
                  </div>
                  <Badge 
                    variant={stats.occupancyRate > 80 ? 'default' : stats.occupancyRate > 50 ? 'secondary' : 'outline'}
                  >
                    {stats.occupancyRate}% {t('admin.backoffice.occupancy', 'occupancy')}
                  </Badge>
                </div>
                
                <Progress value={stats.occupancyRate} className="h-2" />
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{stats.total} {t('admin.backoffice.rooms', 'rooms')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-primary">
                    <Users className="h-3.5 w-3.5" />
                    <span>{stats.occupied} {t('admin.backoffice.occupied', 'occupied')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-accent-foreground">
                    <span>{stats.available} {t('admin.backoffice.free', 'free')}</span>
                  </div>
                  {stats.maintenance > 0 && (
                    <div className="flex items-center gap-1 text-secondary-foreground">
                      <Wrench className="h-3.5 w-3.5" />
                      <span>{stats.maintenance}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Unknown/unassigned rooms */}
          {roomsByBuilding.has('unknown') && (
            <div className="border border-dashed rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DoorOpen className="h-4 w-4" />
                <span>{t('admin.backoffice.unassignedRooms', 'Unassigned Rooms')}</span>
                <Badge variant="outline">{roomsByBuilding.get('unknown')!.length}</Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
