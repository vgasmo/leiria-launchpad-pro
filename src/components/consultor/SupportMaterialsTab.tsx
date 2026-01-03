import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  FileText,
  Link as LinkIcon,
  Tag,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupportMaterials, SupportMaterial } from '@/hooks/useSupportMaterials';

const STARTUP_TYPES = ['b2b', 'b2c', 'marketplace', 'deep_tech', 'impact', 'saas'];
const STARTUP_STAGES = ['idea', 'validation', 'early_traction', 'growth', 'scale'];
const CATEGORIES = ['guide', 'checklist', 'example', 'template'];

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  guide: FileText,
  checklist: CheckCircle2,
  example: LinkIcon,
  template: FileText,
};

export function SupportMaterialsTab() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<SupportMaterial | null>(null);

  const { data: materials, isLoading } = useSupportMaterials({
    startupType: typeFilter || undefined,
    startupStage: stageFilter || undefined,
    category: categoryFilter || undefined,
  });

  const filteredMaterials = materials?.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('consultorTools.searchMaterials', 'Search materials...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Startup type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            {STARTUP_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace('_', ' ').toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All stages</SelectItem>
            {STARTUP_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Materials List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filteredMaterials?.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold mb-2">
              No materials found
            </h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {search ? 'Try adjusting your search or filters' : 'Support materials will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials?.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onClick={() => setSelectedMaterial(material)}
            />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      {selectedMaterial && (
        <MaterialDetailDialog
          open={!!selectedMaterial}
          onOpenChange={(open) => !open && setSelectedMaterial(null)}
          material={selectedMaterial}
        />
      )}
    </div>
  );
}

function MaterialCard({
  material,
  onClick,
}: {
  material: SupportMaterial;
  onClick: () => void;
}) {
  const Icon = CATEGORY_ICONS[material.category || 'guide'] || FileText;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base line-clamp-2">{material.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {material.startup_type && (
                <Badge variant="outline" className="text-xs">
                  {material.startup_type.toUpperCase()}
                </Badge>
              )}
              {material.startup_stage && (
                <Badge variant="secondary" className="text-xs">
                  {material.startup_stage.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {material.description}
        </p>
        {material.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {material.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Tag className="h-2.5 w-2.5 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MaterialDetailDialog({
  open,
  onOpenChange,
  material,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: SupportMaterial;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{material.title}</DialogTitle>
            {material.startup_type && (
              <Badge variant="outline">{material.startup_type.toUpperCase()}</Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 py-2">
            {/* Meta */}
            <div className="flex flex-wrap gap-2">
              {material.startup_stage && (
                <Badge variant="secondary">{material.startup_stage.replace('_', ' ')}</Badge>
              )}
              {material.category && (
                <Badge variant="outline">{material.category}</Badge>
              )}
              {material.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Description */}
            {material.description && (
              <p className="text-muted-foreground">{material.description}</p>
            )}

            {/* Content */}
            {material.content_markdown && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm font-sans bg-muted p-4 rounded-lg">
                  {material.content_markdown}
                </pre>
              </div>
            )}

            {/* External Links */}
            {material.external_links && material.external_links.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Resources</h3>
                <div className="space-y-2">
                  {material.external_links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {link.title || link.url}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
