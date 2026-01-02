import { useState } from 'react';
import { Save, Plus, Calendar, CheckSquare, MessageSquare, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface QuickActionsFabProps {
  onUpdateKpis: () => void;
  onAddAction: () => void;
  onScheduleSession: () => void;
  onCompleteCheckin?: () => void;
  className?: string;
}

export function QuickActionsFab({
  onUpdateKpis,
  onAddAction,
  onScheduleSession,
  onCompleteCheckin,
  className,
}: QuickActionsFabProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions: QuickAction[] = [
    { id: 'kpis', label: 'Atualizar KPIs', icon: <BarChart3 className="h-4 w-4" />, onClick: onUpdateKpis },
    { id: 'action', label: 'Nova Ação', icon: <CheckSquare className="h-4 w-4" />, onClick: onAddAction },
    { id: 'session', label: 'Agendar Sessão', icon: <Calendar className="h-4 w-4" />, onClick: onScheduleSession },
  ];

  if (onCompleteCheckin) {
    actions.push({ id: 'checkin', label: 'Check-in', icon: <MessageSquare className="h-4 w-4" />, onClick: onCompleteCheckin });
  }

  const handleActionClick = (action: QuickAction) => {
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {/* Action buttons */}
      <div className={cn(
        "flex flex-col-reverse gap-2 mb-2 transition-all duration-200",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="secondary"
            size="sm"
            className="shadow-lg flex items-center gap-2 justify-start pl-3 pr-4"
            onClick={() => handleActionClick(action)}
          >
            {action.icon}
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Main FAB button */}
      <Button
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-transform",
          isOpen && "rotate-45"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
