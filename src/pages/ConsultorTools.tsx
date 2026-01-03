import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, FileText, Lightbulb } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExerciseLibraryTab } from '@/components/consultor/ExerciseLibraryTab';
import { SupportMaterialsTab } from '@/components/consultor/SupportMaterialsTab';

export default function ConsultorTools() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('exercises');

  return (
    <AppLayout
      title={t('consultorTools.title', 'Consultor Tools')}
      subtitle={t('consultorTools.subtitle', 'Exercise library and support materials')}
    >
      <div className="space-y-6">
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
