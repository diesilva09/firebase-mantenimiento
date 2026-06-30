'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { forms, submissions } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormsView } from './_components/forms-view';
import { ResponsesView } from './_components/responses-view';
import { StatisticsView } from './_components/statistics-view';
import { MaintenanceRequestsView } from './_components/maintenance-requests-view';
import { tasks } from '@/lib/data';
import { useUserRole } from '@/context/user-role-context';

export default function FormsPage() {
  const allForms = forms;
  const allSubmissions = submissions;
  const allTasks = tasks;
  const { userRole } = useUserRole();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("forms");

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    const nextTab =
      userRole?.role !== "INVITADO" && requestedTab === "maintenance-requests"
        ? "maintenance-requests"
        : "forms";

    setActiveTab(nextTab);
  }, [searchParams, userRole?.role]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sistema de Formularios</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="forms">Formularios</TabsTrigger>
          {userRole?.role !== 'INVITADO' && (
            <>
              <TabsTrigger value="responses">Respuestas</TabsTrigger>
              <TabsTrigger value="statistics">Estadísticas</TabsTrigger>
              <TabsTrigger value="maintenance-requests">Solicitudes MTTO</TabsTrigger>
            </>
          )}
        </TabsList>
        <TabsContent value="forms">
          <FormsView forms={allForms} />
        </TabsContent>
        {userRole?.role !== 'INVITADO' && (
          <>
            <TabsContent value="responses">
              <ResponsesView />
            </TabsContent>
            <TabsContent value="statistics">
              <StatisticsView submissions={allSubmissions} tasks={allTasks} />
            </TabsContent>
            <TabsContent value="maintenance-requests">
              <MaintenanceRequestsView />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
