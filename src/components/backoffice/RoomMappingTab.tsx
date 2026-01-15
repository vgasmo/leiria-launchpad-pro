import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, MapPin, Users, Building2, Monitor,
  DoorOpen, Wrench, Image, Upload, Trash2, UserCheck
} from 'lucide-react';
import {
  useRoomsWithAllocations,
  useCreateRoom,
  useUpdateRoom,
  useCreateRoomAllocation,
  useEndRoomAllocation,
  useFloorMaps,
  useCreateFloorMap,
  useDeleteFloorMap,
  useOfficeSpaces,
  useBuildings,
  useCreateOfficeSpace,
  type Room,
  type FloorMap
} from '@/hooks/useBackoffice';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useFunnelItems } from '@/hooks/useFunnel';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ROOM_TYPE_CONFIG: Record<string, { label: string; icon: typeof DoorOpen }> = {
  office: { label: 'Office', icon: Building2 },
  desk: { label: 'Desk', icon: Monitor },
  meeting_room: { label: 'Meeting Room', icon: Users },
  lab: { label: 'Lab', icon: Wrench },
  event_space: { label: 'Event Space', icon: Users },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-green-500' },
  occupied: { label: 'Occupied', color: 'bg-blue-500' },
  maintenance: { label: 'Maintenance', color: 'bg-yellow-500' },
  reserved: { label: 'Reserved', color: 'bg-purple-500' },
};

// FloorMapCard component to handle async URL loading
function FloorMapCard({ map, onDelete }: { map: FloorMap & { space?: { name: string } }; onDelete: () => void }) {
  const { t } = useTranslation();
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const isPdf = map.file_path.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    const loadUrl = async () => {
      const { data, error } = await supabase.storage.from('floor-maps').createSignedUrl(map.file_path, 3600);
      if (!error && data?.signedUrl) {
        setSignedUrl(data.signedUrl);
      }
      setLoading(false);
    };
    loadUrl();
  }, [map.file_path]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{map.name}</CardTitle>
            <CardDescription>
              {map.space?.name} {map.floor && `• Floor ${map.floor}`}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        ) : signedUrl ? (
          isPdf ? (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-video bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Image className="h-10 w-10" />
                <span className="text-sm font-medium">{t('backoffice.openPdf', 'Open PDF')}</span>
              </div>
            </a>
          ) : (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-video bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
            >
              <img
                src={signedUrl}
                alt={map.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </a>
          )
        ) : (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Unable to load</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RoomMappingTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedSpace, setSelectedSpace] = useState<string>('all');
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomToAllocate, setRoomToAllocate] = useState<Room | null>(null);
  const [uploading, setUploading] = useState(false);

  const [mapBuildingId, setMapBuildingId] = useState<string>('');
  const [mapName, setMapName] = useState<string>('');
  const [mapFloor, setMapFloor] = useState<string>('');

  const { data: buildings } = useBuildings();
  const { data: spaces } = useOfficeSpaces();
  const { data: rooms, isLoading } = useRoomsWithAllocations(selectedSpace === 'all' ? undefined : selectedSpace);
  const { data: floorMaps } = useFloorMaps(selectedSpace === 'all' ? undefined : selectedSpace);
  const { data: workspaces } = useWorkspaces();
  const { data: funnelItems } = useFunnelItems();

  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const createAllocation = useCreateRoomAllocation();
  const endAllocation = useEndRoomAllocation();
  const createFloorMap = useCreateFloorMap();
  const deleteFloorMap = useDeleteFloorMap();
  const createOfficeSpace = useCreateOfficeSpace();

  const handleSaveRoom = async (formData: FormData) => {
    const payload = {
      space_id: formData.get('space_id') as string,
      name: formData.get('name') as string,
      room_number: formData.get('room_number') as string || null,
      floor: formData.get('floor') as string || null,
      room_type: formData.get('room_type') as string,
      capacity: parseInt(formData.get('capacity') as string) || null,
      status: formData.get('status') as string,
      notes: formData.get('notes') as string || null,
    };

    if (selectedRoom) {
      await updateRoom.mutateAsync({ id: selectedRoom.id, ...payload });
    } else {
      await createRoom.mutateAsync(payload);
    }
    setRoomDialogOpen(false);
    setSelectedRoom(null);
  };

  const handleAllocate = async (formData: FormData) => {
    if (!roomToAllocate || !user) return;
    
    const workspaceId = formData.get('workspace_id') as string;
    const funnelItemId = formData.get('funnel_item_id') as string;

    await createAllocation.mutateAsync({
      room_id: roomToAllocate.id,
      workspace_id: workspaceId || null,
      funnel_item_id: funnelItemId || null,
      allocation_type: formData.get('allocation_type') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string || null,
      notes: formData.get('notes') as string || null,
      created_by: user.id,
    });
    setAllocateDialogOpen(false);
    setRoomToAllocate(null);
  };

  const handleUploadFloorMap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file || !user) return;

    if (!mapBuildingId) {
      toast.error(t('backoffice.selectBuildingFirst', 'Please select a building first'));
      inputEl.value = '';
      return;
    }

    const getErrorMessage = (err: unknown) => {
      if (!err) return '';
      if (typeof err === 'string') return err;
      if (typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') return (err as any).message;
      if (typeof err === 'object' && 'error_description' in err && typeof (err as any).error_description === 'string') return (err as any).error_description;
      return '';
    };

    setUploading(true);
    try {
      // Floor maps are tied to office_spaces (space_id). If the admin hasn't created
      // any spaces yet, we create a lightweight “building space” record so maps can be stored.
      let spaceId = spaces?.find((s: any) => s.building_id === mapBuildingId)?.id as string | undefined;

      if (!spaceId) {
        const buildingName = buildings?.find((b) => b.id === mapBuildingId)?.name || 'Building';
        const created = await createOfficeSpace.mutateAsync({
          name: buildingName,
          type: 'private_office',
          building_id: mapBuildingId,
        });
        spaceId = (created as any)?.id;
      }

      if (!spaceId) {
        throw new Error('Unable to resolve office space for building');
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${spaceId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('floor-maps')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      await createFloorMap.mutateAsync({
        space_id: spaceId,
        name: (mapName || file.name).trim(),
        floor: (mapFloor || '').trim() || null,
        file_path: filePath,
        uploaded_by: user.id,
      });

      // Reset before closing to avoid interacting with an unmounted input
      inputEl.value = '';
      setMapBuildingId('');
      setMapName('');
      setMapFloor('');
      setMapDialogOpen(false);
    } catch (error) {
      console.error('Upload floor map failed', error);
      const details = getErrorMessage(error);
      toast.error(
        details
          ? `${t('backoffice.uploadMapFailed', 'Failed to upload floor map')}: ${details}`
          : t('backoffice.uploadMapFailed', 'Failed to upload floor map')
      );
    } finally {
      setUploading(false);
    }
  };

  // Group rooms by floor
  const roomsByFloor = rooms?.reduce((acc, room) => {
    const floor = room.floor || 'Unknown';
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  const occupiedCount = rooms?.filter(r => r.current_allocation).length || 0;
  const availableCount = rooms?.filter(r => !r.current_allocation && r.status === 'available').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t('backoffice.roomMapping', 'Room Mapping')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('backoffice.roomMappingDesc', 'Map rooms and track which startups are where')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedSpace} onValueChange={setSelectedSpace}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('backoffice.allBuildings', 'All Buildings')}</SelectItem>
              {spaces?.map(space => (
                <SelectItem key={space.id} value={space.id}>{space.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Image className="h-4 w-4 mr-2" />
                {t('backoffice.uploadMap', 'Upload Map')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('backoffice.uploadFloorMap', 'Upload Floor Map')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('backoffice.building', 'Building')}</Label>
                  <Select value={mapBuildingId} onValueChange={setMapBuildingId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('backoffice.selectBuilding', 'Select building...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings?.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('backoffice.mapName', 'Map Name')}</Label>
                    <Input
                      value={mapName}
                      onChange={(e) => setMapName(e.target.value)}
                      placeholder={t('backoffice.mapNamePlaceholder', 'Ground Floor Layout')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('backoffice.floor', 'Floor')}</Label>
                    <Input
                      value={mapFloor}
                      onChange={(e) => setMapFloor(e.target.value)}
                      placeholder={t('backoffice.floorPlaceholder', 'Ground, 1, 2...')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('backoffice.mapFile', 'Map File')}</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleUploadFloorMap}
                    disabled={uploading || !mapBuildingId}
                  />
                  {!mapBuildingId && (
                    <p className="text-xs text-muted-foreground">
                      {t('backoffice.selectBuildingFirst', 'Please select a building first')}
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedRoom(null)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('backoffice.addRoom', 'Add Room')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedRoom ? t('backoffice.editRoom', 'Edit Room') : t('backoffice.addRoom', 'Add Room')}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveRoom(new FormData(e.currentTarget));
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>{t('backoffice.building', 'Building')}</Label>
                  <Select name="space_id" defaultValue={selectedRoom?.space_id || selectedSpace !== 'all' ? selectedSpace : undefined} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select building..." />
                    </SelectTrigger>
                    <SelectContent>
                      {spaces?.map(space => (
                        <SelectItem key={space.id} value={space.id}>{space.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('backoffice.roomName', 'Room Name')}</Label>
                    <Input
                      name="name"
                      placeholder="Office A1, Lab 2..."
                      defaultValue={selectedRoom?.name || ''}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('backoffice.roomNumber', 'Room Number')}</Label>
                    <Input
                      name="room_number"
                      placeholder="101, A-23..."
                      defaultValue={selectedRoom?.room_number || ''}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('backoffice.floor', 'Floor')}</Label>
                    <Input
                      name="floor"
                      placeholder="Ground, 1, 2..."
                      defaultValue={selectedRoom?.floor || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('backoffice.type', 'Type')}</Label>
                    <Select name="room_type" defaultValue={selectedRoom?.room_type || 'office'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROOM_TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('backoffice.capacity', 'Capacity')}</Label>
                    <Input
                      type="number"
                      name="capacity"
                      defaultValue={selectedRoom?.capacity || ''}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('backoffice.status', 'Status')}</Label>
                  <Select name="status" defaultValue={selectedRoom?.status || 'available'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('backoffice.notes', 'Notes')}</Label>
                  <Textarea
                    name="notes"
                    defaultValue={selectedRoom?.notes || ''}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setRoomDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit">
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{rooms?.length || 0}</div>
            <p className="text-sm text-muted-foreground">{t('backoffice.totalRooms', 'Total Rooms')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{availableCount}</div>
            <p className="text-sm text-muted-foreground">{t('backoffice.availableRooms', 'Available')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{occupiedCount}</div>
            <p className="text-sm text-muted-foreground">{t('backoffice.occupiedRooms', 'Occupied')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{floorMaps?.length || 0}</div>
            <p className="text-sm text-muted-foreground">{t('backoffice.floorMaps', 'Floor Maps')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rooms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rooms">
            <DoorOpen className="h-4 w-4 mr-2" />
            {t('backoffice.rooms', 'Rooms')}
          </TabsTrigger>
          <TabsTrigger value="maps">
            <Image className="h-4 w-4 mr-2" />
            {t('backoffice.floorMaps', 'Floor Maps')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rooms">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
          ) : (
            <div className="space-y-6">
              {roomsByFloor && Object.entries(roomsByFloor).map(([floor, floorRooms]) => (
                <div key={floor} className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Floor {floor}
                    <Badge variant="secondary">{floorRooms.length} rooms</Badge>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {floorRooms.map(room => {
                      const TypeIcon = ROOM_TYPE_CONFIG[room.room_type]?.icon || DoorOpen;
                      const statusConfig = STATUS_CONFIG[room.status] || STATUS_CONFIG.available;
                      const allocation = room.current_allocation;
                      const occupantName = allocation?.workspace?.startup?.name || 
                        allocation?.funnel_item?.organization_name || 
                        allocation?.funnel_item?.contact_name;

                      return (
                        <Card
                          key={room.id}
                          className={cn(
                            'transition-all hover:shadow-md',
                            allocation && 'border-primary/30 bg-primary/5'
                          )}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <CardTitle className="text-base">{room.name}</CardTitle>
                                  {room.room_number && (
                                    <CardDescription>#{room.room_number}</CardDescription>
                                  )}
                                </div>
                              </div>
                              <div className={cn('h-2 w-2 rounded-full', statusConfig.color)} />
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {room.capacity || '?'} people
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {ROOM_TYPE_CONFIG[room.room_type]?.label || room.room_type}
                              </Badge>
                            </div>

                            {allocation && occupantName && (
                              <div className="text-sm bg-primary/10 rounded p-2">
                                <div className="flex items-center gap-1">
                                  <UserCheck className="h-3 w-3 text-primary" />
                                  <span className="font-medium">{occupantName}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  Since {format(new Date(allocation.start_date), 'MMM yyyy')}
                                </span>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedRoom(room);
                                  setRoomDialogOpen(true);
                                }}
                              >
                                {t('common.edit')}
                              </Button>
                              {!allocation && room.status === 'available' ? (
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => {
                                    setRoomToAllocate(room);
                                    setAllocateDialogOpen(true);
                                  }}
                                >
                                  {t('backoffice.allocate', 'Allocate')}
                                </Button>
                              ) : allocation ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => endAllocation.mutate({ id: allocation.id, roomId: room.id })}
                                >
                                  {t('backoffice.endAllocation', 'End')}
                                </Button>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="maps">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {floorMaps?.map(map => (
              <FloorMapCard 
                key={map.id} 
                map={map} 
                onDelete={() => deleteFloorMap.mutate({ id: map.id, filePath: map.file_path })}
              />
            ))}

            {(!floorMaps || floorMaps.length === 0) && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Image className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium">{t('backoffice.noFloorMaps', 'No Floor Maps')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('backoffice.noFloorMapsDesc', 'Upload floor plans to help visualize your spaces')}
                  </p>
                  <Button onClick={() => setMapDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('backoffice.uploadMap', 'Upload Map')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Allocation Dialog */}
      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('backoffice.allocateRoom', 'Allocate Room')}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAllocate(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">{t('backoffice.room', 'Room')}:</span>
              <span className="font-medium ml-2">{roomToAllocate?.name}</span>
            </div>

            <div className="space-y-2">
              <Label>{t('backoffice.allocateTo', 'Allocate To')}</Label>
              <Tabs defaultValue="startup" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="startup" className="flex-1">Startup</TabsTrigger>
                  <TabsTrigger value="lead" className="flex-1">Lead/Prospect</TabsTrigger>
                </TabsList>
                <TabsContent value="startup" className="mt-2">
                  <Select name="workspace_id">
                    <SelectTrigger>
                      <SelectValue placeholder={t('backoffice.selectStartup', 'Select startup...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces?.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.startup?.name || 'Unnamed'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
                <TabsContent value="lead" className="mt-2">
                  <Select name="funnel_item_id">
                    <SelectTrigger>
                      <SelectValue placeholder={t('backoffice.selectLead', 'Select lead...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {funnelItems?.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.organization_name || item.contact_name || 'Unnamed'}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label>{t('backoffice.allocationType', 'Type')}</Label>
              <Select name="allocation_type" defaultValue="permanent">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                  <SelectItem value="hotdesk">Hot Desk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('backoffice.startDate', 'Start Date')}</Label>
                <Input
                  type="date"
                  name="start_date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('backoffice.endDate', 'End Date')}</Label>
                <Input type="date" name="end_date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('backoffice.notes', 'Notes')}</Label>
              <Textarea name="notes" />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAllocateDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('backoffice.confirmAllocation', 'Confirm Allocation')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}