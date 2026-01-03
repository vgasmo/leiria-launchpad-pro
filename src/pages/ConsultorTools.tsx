import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Lightbulb, Sparkles, Shield } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExerciseLibraryTab } from '@/components/consultor/ExerciseLibraryTab';
import { SupportMaterialsTab } from '@/components/consultor/SupportMaterialsTab';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function ConsultorTools() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('exercises');

  return (
    <AppLayout
      title={t('consultorTools.title', 'Consultor Tools')}
      subtitle={t('consultorTools.subtitle', 'Exercise library, support materials, and productivity tools')}
    >
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/my-workspaces')}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Value Proposition Wizard</CardTitle>
                  <CardDescription>Create compelling VPs in 5-7 minutes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Guided wizard to build value propositions. Access from any workspace.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Quality Gates</CardTitle>
                  <CardDescription>Session & proposal quality checks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatic quality scoring appears on sessions and proposals.
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="exercises" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              {t('consultorTools.exercises', 'Exercises')}
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('consultorTools.materials', 'Support Materials')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exercises" className="mt-6">
            <ExerciseLibraryTab />
          </TabsContent>

          <TabsContent value="materials" className="mt-6">
            <SupportMaterialsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
