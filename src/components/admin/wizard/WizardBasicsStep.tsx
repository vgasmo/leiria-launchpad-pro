import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrograms } from '@/hooks/useProgramSetup';
import type { DraftBasics } from '@/hooks/useProgramSetup';

interface WizardBasicsStepProps {
  data: DraftBasics;
  onUpdate: (data: DraftBasics) => void;
}

export function WizardBasicsStep({ data, onUpdate }: WizardBasicsStepProps) {
  const [localData, setLocalData] = useState<DraftBasics>(data);
  const { data: programs } = usePrograms();

  // Debounced update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(localData) !== JSON.stringify(data)) {
        onUpdate(localData);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localData, data, onUpdate]);

  const handleChange = (field: keyof DraftBasics, value: string) => {
    setLocalData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCloneFrom = (programId: string) => {
    const program = programs?.find((p) => p.id === programId);
    if (program) {
      setLocalData({
        name: `${program.name} (Copy)`,
        description: program.description || undefined,
        start_date: undefined,
        end_date: undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Clone from existing */}
      {programs && programs.length > 0 && !data.name && (
        <div className="p-4 border rounded-lg bg-muted/50">
          <Label className="text-sm font-medium">Clone from existing program</Label>
          <Select onValueChange={handleCloneFrom}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select a program to clone..." />
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            This will copy stages, KPIs, playbooks, and alert rules from the selected program.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="name">Program Name *</Label>
          <Input
            id="name"
            value={localData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Accelerator 2024"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={localData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe the program objectives and focus areas..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            value={localData.start_date || ''}
            onChange={(e) => handleChange('start_date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            type="date"
            value={localData.end_date || ''}
            onChange={(e) => handleChange('end_date', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}