"use client"

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Wrench } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, addMonths, subMonths, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/lib/types';

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const statusColors = {
  Completada: 'bg-green-500',
  Pendiente: 'bg-red-500',
  Futura: 'bg-blue-500',
};

const priorityColors = {
  Alta: 'bg-red-500',
  Media: 'bg-orange-500',
  Baja: 'bg-green-500',
};

export function TaskCalendarView({ tasks, onTaskClick }: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);

  const daysInMonth = eachDayOfInterval({
    start: firstDayOfMonth,
    end: lastDayOfMonth,
  });

  const startingDayIndex = getDay(firstDayOfMonth) === 0 ? 6 : getDay(firstDayOfMonth) - 1;

  const daysToPrepend = Array.from({ length: startingDayIndex }, (_, i) => {
    return subMonths(lastDayOfMonth,1);
  });

  const tasksByDate = React.useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    tasks.forEach(task => {
      const dateKey = format(new Date(task.nextExecution), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    return grouped;
  }, [tasks]);

  const Legend = () => (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-4 p-2 bg-card rounded-md border text-xs sm:text-sm">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div>Completada</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div>Pendiente</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div>Futura</div>
        <div className="hidden sm:block border-l h-4 mx-2"></div>
        <div className="font-semibold">Prioridad:</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div>Alta</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div>Media</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div>Baja</div>
    </div>
  );

  const hasTasks = tasks.length > 0;

  return (
    <Card>
      <CardContent className="p-2 sm:p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-xl font-bold capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {hasTasks ? (
          <>
            <Legend />

            <div className="overflow-x-auto w-full">
              <div className="grid grid-cols-7 border-t border-l min-w-[640px] sm:min-w-[700px]">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                  <div key={day} className="p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm border-r border-b bg-muted/50">{day}</div>
                ))}
                
                {Array.from({ length: startingDayIndex }).map((_, index) => (
                  <div key={`empty-start-${index}`} className="h-24 sm:h-32 border-r border-b bg-muted/20"></div>
                ))}

                {daysInMonth.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayTasks = tasksByDate[dateKey] || [];
                return (
                  <div key={day.toString()} className={cn("h-28 sm:h-40 p-1 sm:p-2 border-r border-b flex flex-col overflow-hidden relative", { "bg-blue-100 dark:bg-blue-900/30": isToday(day) })}>
                    <span className={cn("font-medium text-xs sm:text-sm", isSameMonth(day, currentDate) ? 'text-foreground' : 'text-muted-foreground')}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex-grow overflow-y-auto -mx-1 px-1 mt-1">
                      <div className="space-y-1">
                        {dayTasks.map(task => (
                          <button key={task.id} onClick={() => onTaskClick(task)} className="w-full">
                            <div className={cn("p-1 rounded-md text-left text-[10px] sm:text-xs text-white", statusColors[task.status])}>
                                <div className="flex items-center gap-1">
                                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", priorityColors[task.priority])} title={`Prioridad ${task.priority}`}></div>
                                    <span className="font-semibold truncate">{task.code}</span>
                                </div>
                                <p className="truncate hidden sm:block">{task.area}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
                })}
                
                {Array.from({ length: (7 - (daysInMonth.length + startingDayIndex) % 7) % 7 }).map((_, index) => (
                   <div key={`empty-end-${index}`} className="h-24 sm:h-32 border-r border-b bg-muted/20"></div>
                ))}

              </div>
            </div>
          </>
        ) : (
            <div className="text-center text-muted-foreground py-12 border rounded-md">
                <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">No hay labores</h3>
                <p className="mt-1 text-sm text-gray-500">No hay tareas para este cronograma.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
