import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Edit2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CanvasSection {
  id: string;
  label: string;
  placeholder: string;
  gridArea: string;
  color: string;
}

interface CanvasTemplateProps {
  type: 'bmc' | 'lean';
  data: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
  disabled?: boolean;
}

const BMC_SECTIONS: CanvasSection[] = [
  { id: 'key_partners', label: 'Key Partners', placeholder: 'Who are your key partners and suppliers?', gridArea: 'partners', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'key_activities', label: 'Key Activities', placeholder: 'What key activities does your value proposition require?', gridArea: 'activities', color: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800' },
  { id: 'key_resources', label: 'Key Resources', placeholder: 'What key resources does your value proposition require?', gridArea: 'resources', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'value_propositions', label: 'Value Propositions', placeholder: 'What value do you deliver to the customer?', gridArea: 'value', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'customer_relationships', label: 'Customer Relationships', placeholder: 'What type of relationship does each customer segment expect?', gridArea: 'relationships', color: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800' },
  { id: 'channels', label: 'Channels', placeholder: 'How do you reach your customer segments?', gridArea: 'channels', color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
  { id: 'customer_segments', label: 'Customer Segments', placeholder: 'For whom are you creating value?', gridArea: 'segments', color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  { id: 'cost_structure', label: 'Cost Structure', placeholder: 'What are the most important costs?', gridArea: 'costs', color: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-700' },
  { id: 'revenue_streams', label: 'Revenue Streams', placeholder: 'For what value are customers willing to pay?', gridArea: 'revenue', color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
];

const LEAN_SECTIONS: CanvasSection[] = [
  { id: 'problem', label: 'Problem', placeholder: 'Top 3 problems your customers face', gridArea: 'problem', color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  { id: 'solution', label: 'Solution', placeholder: 'Top 3 features that solve the problems', gridArea: 'solution', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  { id: 'key_metrics', label: 'Key Metrics', placeholder: 'Key activities you measure', gridArea: 'metrics', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  { id: 'unique_value', label: 'Unique Value Proposition', placeholder: 'Single, clear message that states why you are different', gridArea: 'uvp', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  { id: 'unfair_advantage', label: 'Unfair Advantage', placeholder: 'Something that cannot be easily copied or bought', gridArea: 'advantage', color: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800' },
  { id: 'channels', label: 'Channels', placeholder: 'Path to customers', gridArea: 'channels', color: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800' },
  { id: 'customer_segments', label: 'Customer Segments', placeholder: 'Target customers', gridArea: 'segments', color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
  { id: 'cost_structure', label: 'Cost Structure', placeholder: 'Customer acquisition costs, hosting, etc.', gridArea: 'costs', color: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-700' },
  { id: 'revenue_streams', label: 'Revenue Streams', placeholder: 'Revenue model, lifetime value, etc.', gridArea: 'revenue', color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
];

export function CanvasTemplate({ type, data, onChange, disabled = false }: CanvasTemplateProps) {
  const { t } = useTranslation();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const sections = type === 'bmc' ? BMC_SECTIONS : LEAN_SECTIONS;
  const title = type === 'bmc' ? 'Business Model Canvas' : 'Lean Canvas';

  const handleEdit = (sectionId: string) => {
    setEditingSection(sectionId);
    setEditValue(data[sectionId] || '');
  };

  const handleSave = () => {
    if (editingSection) {
      onChange({ ...data, [editingSection]: editValue });
      setEditingSection(null);
      setEditValue('');
    }
  };

  const handleCancel = () => {
    setEditingSection(null);
    setEditValue('');
  };

  // Grid layout for BMC
  const bmcGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(10, 1fr)',
    gridTemplateRows: 'repeat(6, minmax(120px, auto))',
    gap: '4px',
    gridTemplateAreas: `
      "partners partners activities activities value value relationships relationships segments segments"
      "partners partners activities activities value value relationships relationships segments segments"
      "partners partners resources resources value value channels channels segments segments"
      "partners partners resources resources value value channels channels segments segments"
      "costs costs costs costs costs revenue revenue revenue revenue revenue"
      "costs costs costs costs costs revenue revenue revenue revenue revenue"
    `,
  };

  // Grid layout for Lean Canvas
  const leanGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(10, 1fr)',
    gridTemplateRows: 'repeat(6, minmax(120px, auto))',
    gap: '4px',
    gridTemplateAreas: `
      "problem problem solution solution uvp uvp advantage advantage segments segments"
      "problem problem solution solution uvp uvp advantage advantage segments segments"
      "problem problem metrics metrics uvp uvp channels channels segments segments"
      "problem problem metrics metrics uvp uvp channels channels segments segments"
      "costs costs costs costs costs revenue revenue revenue revenue revenue"
      "costs costs costs costs costs revenue revenue revenue revenue revenue"
    `,
  };

  const gridStyle = type === 'bmc' ? bmcGridStyle : leanGridStyle;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {title}
            <Badge variant="outline" className="ml-2">
              {type === 'bmc' ? 'Osterwalder' : 'Ash Maurya'}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="w-full">
          <div style={gridStyle} className="min-w-[800px]">
            {sections.map((section) => {
              const isEditing = editingSection === section.id;
              const hasContent = !!data[section.id];

              return (
                <div
                  key={section.id}
                  style={{ gridArea: section.gridArea }}
                  className={`relative rounded-lg border-2 p-3 transition-all ${section.color} ${
                    !disabled ? 'hover:shadow-md cursor-pointer' : ''
                  }`}
                  onClick={() => !disabled && !isEditing && handleEdit(section.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-foreground/80">
                      {section.label}
                    </h4>
                    {!disabled && hasContent && !isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(section.id);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder={section.placeholder}
                        className="min-h-[80px] text-sm bg-background/80"
                        autoFocus
                      />
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7">
                          <X className="h-3 w-3 mr-1" />
                          {t('common.cancel')}
                        </Button>
                        <Button size="sm" onClick={handleSave} className="h-7">
                          <Save className="h-3 w-3 mr-1" />
                          {t('common.save')}
                        </Button>
                      </div>
                    </div>
                  ) : hasContent ? (
                    <div className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-6">
                      {data[section.id]}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      {section.placeholder}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
