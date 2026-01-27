import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MapPin, Building2, Users, ExternalLink } from 'lucide-react';
import { useRoomsWithAllocations, useBuildings, useOfficeSpaces, useFloorMaps, type Room, type FloorMap } from '@/hooks/useBackoffice';
import { format } from 'date-fns';

interface StartupSpaceSearchProps {
  onViewRoom?: (room: Room) => void;
  onViewFloorMap?: (floorMap: FloorMap, room: Room) => void;
}

export function StartupSpaceSearch({ onViewRoom, onViewFloorMap }: StartupSpaceSearchProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: rooms, isLoading } = useRoomsWithAllocations();
  const { data: buildings } = useBuildings();
  const { data: spaces } = useOfficeSpaces();
  const { data: floorMaps } = useFloorMaps();

  // Filter rooms with active allocations that match search
  const searchResults = useMemo(() => {
    if (!rooms || !searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    
    return rooms.filter(room => {
      const allocation = room.current_allocation;
      if (!allocation) return false;
      
      const startupName = allocation.workspace?.startup?.name?.toLowerCase() || '';
      const orgName = allocation.funnel_item?.organization_name?.toLowerCase() || '';
      const contactName = allocation.funnel_item?.contact_name?.toLowerCase() || '';
      const roomName = room.name.toLowerCase();
      const roomNumber = room.room_number?.toLowerCase() || '';
      
      return (
        startupName.includes(query) ||
        orgName.includes(query) ||
        contactName.includes(query) ||
        roomName.includes(query) ||
        roomNumber.includes(query)
      );
    });
  }, [rooms, searchQuery]);

  const getBuildingName = (room: Room) => {
    const space = spaces?.find(s => s.id === room.space_id);
    const buildingId = (space as any)?.building_id;
    return buildings?.find(b => b.id === buildingId)?.name || space?.name || 'Unknown';
  };

  const getFloorMap = (room: Room) => {
    return floorMaps?.find(fm => fm.id === room.floor_map_id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          {t('admin.backoffice.findStartupLocation', 'Find Startup Location')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.backoffice.searchStartupPlaceholder', 'Search by startup name, organization, or room...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {searchQuery.trim() && (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('admin.backoffice.noResultsFound', 'No results found')}
                </div>
              ) : (
                searchResults.map(room => {
                  const allocation = room.current_allocation!;
                  const occupantName = allocation.workspace?.startup?.name ||
                    allocation.funnel_item?.organization_name ||
                    allocation.funnel_item?.contact_name ||
                    'Unknown';
                  const buildingName = getBuildingName(room);
                  const floorMap = getFloorMap(room);

                  return (
                    <div
                      key={room.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="font-medium truncate">{occupantName}</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              <span>{buildingName}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{room.name}</span>
                              {room.room_number && (
                                <Badge variant="outline" className="text-xs">
                                  #{room.room_number}
                                </Badge>
                              )}
                            </div>
                            {room.floor && (
                              <>
                                <span>•</span>
                                <span>Floor {room.floor}</span>
                              </>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground mt-1">
                            {t('admin.backoffice.since', 'Since')} {format(new Date(allocation.start_date), 'MMM yyyy')}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {floorMap && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewFloorMap?.(floorMap, room)}
                              title={t('admin.backoffice.viewOnMap', 'View on map')}
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewRoom?.(room)}
                            title={t('admin.backoffice.viewDetails', 'View details')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}

        {!searchQuery.trim() && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('admin.backoffice.startTypingToSearch', 'Start typing to search for startups and their locations')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
