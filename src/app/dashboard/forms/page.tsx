import type { Metadata } from 'next';
import { forms, submissions } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormsView } from './_components/forms-view';
import { ResponsesView } from './_components/responses-view';
import { StatisticsView } from './_components/statistics-view';
import { tasks } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Sistema de Formularios | Maintenance Hub',
}

export default async function FormsPage() {
  const allForms = forms;
  const allSubmissions = submissions;
  const allTasks = tasks;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sistema de Formularios</h1>
      </div>

      <Tabs defaultValue="forms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forms">Formularios</TabsTrigger>
          <TabsTrigger value="responses">Respuestas</TabsTrigger>
          <TabsTrigger value="statistics">Estadísticas</TabsTrigger>
        </TabsList>
        <TabsContent value="forms">
          <FormsView forms={allForms} />
        </TabsContent>
        <TabsContent value="responses">
          <ResponsesView />
        </TabsContent>
        <TabsContent value="statistics">
          <StatisticsView submissions={allSubmissions} tasks={allTasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
