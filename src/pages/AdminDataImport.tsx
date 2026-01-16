import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, FileSpreadsheet, Users, Building2, Briefcase, 
  PlayCircle, CheckCircle2, AlertTriangle, Download, Trash2,
  RefreshCw, Shield, ArrowRight, Info, X
} from 'lucide-react';
import { usePrograms } from '@/hooks/useWorkspaces';
import { useConsultors } from '@/hooks/useWorkspaceOwner';
import { useMasterDatasetImport, FileParseResult } from '@/hooks/useMasterDatasetImport';
import { datasetToCSV } from '@/lib/masterDataset';
import { cn } from '@/lib/utils';

const FILE_TYPES = [
  { type: 'excel_clients', label: 'Excel Clients', icon: FileSpreadsheet, color: 'text-green-600' },
  { type: 'hubspot_contacts', label: 'HubSpot Contacts', icon: Users, color: 'text-orange-600' },
  { type: 'hubspot_companies', label: 'HubSpot Companies', icon: Building2, color: 'text-orange-600' },
  { type: 'hubspot_deals', label: 'HubSpot Deals', icon: Briefcase, color: 'text-orange-600' },
] as const;

export default function AdminDataImport() {
  const { t } = useTranslation();
  const { data: programs } = usePrograms();
  const { data: consultors } = useConsultors();
  
  const {
    parsedFiles,
    masterDataset,
    dryRunResult,
    addParsedFile,
    removeParsedFile,
    clearParsedFiles,
    buildDataset,
    dryRun,
    isDryRunning,
    performImport,
    isImporting,
  } = useMasterDatasetImport();

  const [config, setConfig] = useState({
    program_id: '',
    default_stage: 'new',
    owner_consultant_id: '',
    upsert_mode: false,
  });

  const [activeTab, setActiveTab] = useState('upload');
  const [safetyChecks, setSafetyChecks] = useState({
    understood_dry_run: false,
    backup_exists: false,
    program_confirmed: false,
  });

  const handleFileUpload = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: FileParseResult['type']
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        let rows: Record<string, unknown>[] = [];
        
        if (file.name.endsWith('.csv')) {
          rows = parseCSV(text);
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // For Excel files, we'd need a library. For now, prompt user to convert to CSV
          alert(t('dataImport.convertToCSV', 'Please convert Excel files to CSV before uploading.'));
          return;
        } else {
          rows = parseCSV(text);
        }

        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        
        addParsedFile({
          fileName: file.name,
          rowCount: rows.length,
          columns,
          rows,
          type: fileType,
        });
      } catch (error) {
        console.error('Error parsing file:', error);
        alert(t('dataImport.parseError', 'Error parsing file. Please check the format.'));
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  }, [addParsedFile, t]);

  const handleBuildDataset = useCallback(() => {
    const dataset = buildDataset();
    if (dataset) {
      setActiveTab('preview');
    }
  }, [buildDataset]);

  const handleDryRun = useCallback(() => {
    if (!config.program_id) {
      alert(t('dataImport.selectProgram', 'Please select a program'));
      return;
    }
    dryRun({ ...config, dry_run: true });
  }, [config, dryRun, t]);

  const handleImport = useCallback(() => {
    if (!config.program_id) {
      alert(t('dataImport.selectProgram', 'Please select a program'));
      return;
    }
    if (!Object.values(safetyChecks).every(Boolean)) {
      alert(t('dataImport.confirmSafetyChecks', 'Please confirm all safety checks'));
      return;
    }
    performImport({ ...config, dry_run: false });
  }, [config, safetyChecks, performImport, t]);

  const handleDownload = useCallback((type: 'organizations' | 'people' | 'deals' | 'all') => {
    if (!masterDataset) return;
    
    let content: string;
    let filename: string;
    
    if (type === 'all') {
      content = JSON.stringify(masterDataset, null, 2);
      filename = 'master_dataset.json';
    } else if (type === 'organizations') {
      content = datasetToCSV(masterDataset.organizations);
      filename = 'master_organizations.csv';
    } else if (type === 'people') {
      content = datasetToCSV(masterDataset.people);
      filename = 'master_people.csv';
    } else {
      content = datasetToCSV(masterDataset.deals);
      filename = 'master_deals.csv';
    }

    const blob = new Blob([content], { type: type === 'all' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [masterDataset]);

  const allSafetyChecked = Object.values(safetyChecks).every(Boolean);
  const canImport = dryRunResult && !dryRunResult.dry_run === false && allSafetyChecked;

  return (
    <AppLayout 
      title={t('dataImport.title', 'Data Import')} 
      subtitle={t('dataImport.subtitle', 'Import organizations and contacts from external sources')}
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              {t('dataImport.upload', 'Upload')}
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2" disabled={!masterDataset}>
              <FileSpreadsheet className="h-4 w-4" />
              {t('dataImport.preview', 'Preview')}
            </TabsTrigger>
            <TabsTrigger value="configure" className="gap-2" disabled={!masterDataset}>
              <RefreshCw className="h-4 w-4" />
              {t('dataImport.configure', 'Configure')}
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2" disabled={!dryRunResult}>
              <CheckCircle2 className="h-4 w-4" />
              {t('dataImport.import', 'Import')}
            </TabsTrigger>
          </TabsList>

          {/* UPLOAD TAB */}
          <TabsContent value="upload" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{t('dataImport.supportedFormats', 'Supported Formats')}</AlertTitle>
              <AlertDescription>
                {t('dataImport.supportedFormatsDesc', 'Upload CSV or XLSX files. Each file type maps to a specific data category.')}
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              {FILE_TYPES.map(({ type, label, icon: Icon, color }) => {
                const parsedFile = parsedFiles.find(f => f.type === type);
                
                return (
                  <Card key={type} className={cn(
                    'relative overflow-hidden transition-all',
                    parsedFile && 'ring-2 ring-primary'
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('h-5 w-5', color)} />
                          <CardTitle className="text-base">{label}</CardTitle>
                        </div>
                        {parsedFile && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => removeParsedFile(type)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {parsedFile ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{parsedFile.fileName}</span>
                            <Badge variant="secondary">{parsedFile.rowCount} rows</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {parsedFile.columns.slice(0, 5).map(col => (
                              <Badge key={col} variant="outline" className="text-xs">
                                {col}
                              </Badge>
                            ))}
                            {parsedFile.columns.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{parsedFile.columns.length - 5}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={(e) => handleFileUpload(e, type)}
                            className="cursor-pointer"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {parsedFiles.length > 0 && (
              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" onClick={clearParsedFiles}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.clearAll', 'Clear All')}
                </Button>
                <Button onClick={handleBuildDataset}>
                  {t('dataImport.buildDataset', 'Build Master Dataset')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </TabsContent>

          {/* PREVIEW TAB */}
          <TabsContent value="preview" className="space-y-6">
            {masterDataset && (
              <>
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <StatsCard
                    icon={Building2}
                    label={t('dataImport.organizations', 'Organizations')}
                    value={masterDataset.metadata.stats.total_orgs}
                    duplicates={masterDataset.organizations.filter(o => o._is_duplicate).length}
                  />
                  <StatsCard
                    icon={Users}
                    label={t('dataImport.people', 'People')}
                    value={masterDataset.metadata.stats.total_people}
                    duplicates={masterDataset.people.filter(p => p._is_duplicate).length}
                  />
                  <StatsCard
                    icon={Briefcase}
                    label={t('dataImport.deals', 'Deals')}
                    value={masterDataset.metadata.stats.total_deals}
                  />
                  <StatsCard
                    icon={AlertTriangle}
                    label={t('dataImport.duplicatesFound', 'Duplicates Found')}
                    value={masterDataset.metadata.stats.duplicates_found}
                    variant="warning"
                  />
                </div>

                {/* Download Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('dataImport.downloadDataset', 'Download Dataset')}</CardTitle>
                    <CardDescription>
                      {t('dataImport.downloadDesc', 'Download the normalized master dataset for review or backup')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload('organizations')}>
                      <Download className="h-4 w-4 mr-2" />
                      master_organizations.csv
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload('people')}>
                      <Download className="h-4 w-4 mr-2" />
                      master_people.csv
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload('deals')}>
                      <Download className="h-4 w-4 mr-2" />
                      master_deals.csv
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleDownload('all')}>
                      <Download className="h-4 w-4 mr-2" />
                      master_dataset.json
                    </Button>
                  </CardContent>
                </Card>

                {/* Preview Tables */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('dataImport.previewOrgs', 'Organizations Preview')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {masterDataset.organizations.slice(0, 20).map((org, idx) => (
                          <div 
                            key={org.external_id} 
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border',
                              org._is_duplicate && 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{org.name}</span>
                                {org._is_duplicate && (
                                  <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                                    {t('dataImport.duplicate', 'Duplicate')}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <span>{org.email_main || '—'}</span>
                                {org.vat_number && <Badge variant="secondary" className="text-xs">{org.vat_number}</Badge>}
                              </div>
                            </div>
                            <Badge variant="outline">{org.external_source}</Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab('configure')}>
                    {t('common.continue', 'Continue')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* CONFIGURE TAB */}
          <TabsContent value="configure" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('dataImport.importConfig', 'Import Configuration')}</CardTitle>
                <CardDescription>
                  {t('dataImport.importConfigDesc', 'Configure how data should be imported into the CRM')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('dataImport.program', 'Program')} *</Label>
                    <Select 
                      value={config.program_id} 
                      onValueChange={v => setConfig({...config, program_id: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('dataImport.selectProgram', 'Select program')} />
                      </SelectTrigger>
                      <SelectContent>
                        {programs?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('dataImport.defaultStage', 'Default Stage')} *</Label>
                    <Select 
                      value={config.default_stage} 
                      onValueChange={v => setConfig({...config, default_stage: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="first_contact_booked">First Contact Booked</SelectItem>
                        <SelectItem value="met">Met</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('dataImport.assignTo', 'Assign to Consultant')}</Label>
                    <Select 
                      value={config.owner_consultant_id} 
                      onValueChange={v => setConfig({...config, owner_consultant_id: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('dataImport.noAssignment', 'No default assignment')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t('dataImport.noAssignment', 'No default assignment')}</SelectItem>
                        {consultors?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('dataImport.importMode', 'Import Mode')}</Label>
                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.upsert_mode}
                          onCheckedChange={v => setConfig({...config, upsert_mode: v})}
                        />
                        <span className="text-sm">
                          {config.upsert_mode 
                            ? t('dataImport.upsertMode', 'Update existing records')
                            : t('dataImport.insertOnly', 'Insert new only')
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button onClick={handleDryRun} disabled={isDryRunning || !config.program_id}>
                    {isDryRunning ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        {t('dataImport.running', 'Running...')}
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        {t('dataImport.dryRun', 'Dry Run')}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dry Run Results */}
            {dryRunResult && (
              <Card className="border-primary">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <CardTitle>{t('dataImport.dryRunResults', 'Dry Run Results')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{dryRunResult.summary.would_insert}</div>
                      <div className="text-sm text-muted-foreground">{t('dataImport.toInsert', 'To Insert')}</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{dryRunResult.summary.would_update}</div>
                      <div className="text-sm text-muted-foreground">{t('dataImport.toUpdate', 'To Update')}</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{dryRunResult.summary.duplicates}</div>
                      <div className="text-sm text-muted-foreground">{t('dataImport.duplicates', 'Duplicates')}</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold">{dryRunResult.summary.skipped}</div>
                      <div className="text-sm text-muted-foreground">{t('dataImport.skipped', 'Skipped')}</div>
                    </div>
                  </div>

                  {dryRunResult.details.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">{t('dataImport.sampleActions', 'Sample Actions')}</h4>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-1">
                          {dryRunResult.details.map((detail, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                              <Badge variant={
                                detail.action === 'insert' ? 'default' :
                                detail.action === 'update' ? 'secondary' :
                                'outline'
                              } className="text-xs">
                                {detail.action}
                              </Badge>
                              <span className="truncate flex-1">{detail.name}</span>
                              {detail.reason && (
                                <span className="text-xs text-muted-foreground">{detail.reason}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={() => setActiveTab('import')}>
                      {t('common.continue', 'Continue')}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="space-y-6">
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertTitle>{t('dataImport.safetyTitle', 'Safety Checklist')}</AlertTitle>
              <AlertDescription>
                {t('dataImport.safetyDesc', 'Please confirm the following before proceeding with the import:')}
              </AlertDescription>
            </Alert>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Switch
                    checked={safetyChecks.understood_dry_run}
                    onCheckedChange={v => setSafetyChecks({...safetyChecks, understood_dry_run: v})}
                  />
                  <div>
                    <Label className="cursor-pointer">
                      {t('dataImport.check1', 'I have reviewed the dry run results and understand what will be imported')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {dryRunResult?.summary.would_insert} {t('dataImport.recordsWillBeInserted', 'records will be inserted')}, {dryRunResult?.summary.would_update} {t('dataImport.willBeUpdated', 'will be updated')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Switch
                    checked={safetyChecks.backup_exists}
                    onCheckedChange={v => setSafetyChecks({...safetyChecks, backup_exists: v})}
                  />
                  <div>
                    <Label className="cursor-pointer">
                      {t('dataImport.check2', 'I have downloaded the master dataset as a backup')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('dataImport.check2Desc', 'This allows you to review what was imported if needed')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Switch
                    checked={safetyChecks.program_confirmed}
                    onCheckedChange={v => setSafetyChecks({...safetyChecks, program_confirmed: v})}
                  />
                  <div>
                    <Label className="cursor-pointer">
                      {t('dataImport.check3', 'I confirm the program and stage configuration is correct')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('common.program', 'Program')}: {programs?.find(p => p.id === config.program_id)?.name || '—'} | {t('common.stage', 'Stage')}: {config.default_stage}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setActiveTab('configure')}>
                {t('common.back', 'Back')}
              </Button>
              <Button
                onClick={handleImport}
                disabled={!allSafetyChecked || isImporting}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t('dataImport.importing', 'Importing...')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t('dataImport.startImport', 'Start Import')}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// Helper component for stats cards
function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  duplicates,
  variant = 'default',
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number;
  duplicates?: number;
  variant?: 'default' | 'warning';
}) {
  return (
    <Card className={cn(
      variant === 'warning' && 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20'
    )}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            variant === 'warning' ? 'bg-yellow-100 dark:bg-yellow-800' : 'bg-muted'
          )}>
            <Icon className={cn(
              'h-5 w-5',
              variant === 'warning' ? 'text-yellow-600' : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
            {duplicates !== undefined && duplicates > 0 && (
              <div className="text-xs text-yellow-600">{duplicates} duplicates</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple CSV parser
function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
