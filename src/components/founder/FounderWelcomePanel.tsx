import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, 
  X, 
  TrendingUp, 
  Target, 
  Users, 
  FileText,
  CheckCircle2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FounderWelcomePanelProps {
  hasStartup: boolean;
  hasProfile: boolean;
  hasKpis: boolean;
  hasMentor: boolean;
  hasDocuments: boolean;
  onCreateStartup: () => void;
  workspaceId?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  action: () => void;
  actionLabel: string;
  icon: React.ReactNode;
}

const CHECKLIST_DISMISSED_KEY = 'founder_checklist_dismissed';
const WELCOME_DISMISSED_KEY = 'founder_welcome_dismissed';

export function FounderWelcomePanel({
  hasStartup,
  hasProfile,
  hasKpis,
  hasMentor,
  hasDocuments,
  onCreateStartup,
  workspaceId,
}: FounderWelcomePanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => 
    localStorage.getItem(WELCOME_DISMISSED_KEY) === 'true'
  );
  const [checklistDismissed, setChecklistDismissed] = useState(() => 
    localStorage.getItem(CHECKLIST_DISMISSED_KEY) === 'true'
  );

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    setWelcomeDismissed(true);
  };

  const dismissChecklist = () => {
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, 'true');
    setChecklistDismissed(true);
  };

  const checklistItems: ChecklistItem[] = [
    {
      id: 'profile',
      label: t('onboarding.completeProfile', 'Complete your profile'),
      description: t('onboarding.completeProfileDesc', 'Help mentors and consultants understand who you are'),
      completed: hasProfile,
      action: () => navigate('/settings'),
      actionLabel: t('onboarding.editProfile', 'Edit Profile'),
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: 'startup',
      label: t('onboarding.addStartup', 'Register your startup'),
      description: t('onboarding.addStartupDesc', 'Set up your company to start tracking progress'),
      completed: hasStartup,
      action: onCreateStartup,
      actionLabel: t('onboarding.createStartup', 'Create Startup'),
      icon: <Rocket className="h-4 w-4" />,
    },
    {
      id: 'kpis',
      label: t('onboarding.setKpis', 'Define your KPIs'),
      description: t('onboarding.setKpisDesc', 'Track what matters most to your growth'),
      completed: hasKpis,
      action: () => workspaceId && navigate(`/workspace/${workspaceId}?tab=kpis`),
      actionLabel: t('onboarding.addKpis', 'Add KPIs'),
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      id: 'documents',
      label: t('onboarding.uploadDeck', 'Upload your pitch deck'),
      description: t('onboarding.uploadDeckDesc', 'Get feedback and share with investors'),
      completed: hasDocuments,
      action: () => workspaceId && navigate(`/workspace/${workspaceId}?tab=documents`),
      actionLabel: t('onboarding.uploadDeck', 'Upload Deck'),
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: 'mentor',
      label: t('onboarding.connectMentor', 'Connect with a mentor'),
      description: t('onboarding.connectMentorDesc', 'Get guidance from experienced professionals'),
      completed: hasMentor,
      action: () => navigate('/mentors'),
      actionLabel: t('onboarding.findMentors', 'Find Mentors'),
      icon: <Users className="h-4 w-4" />,
    },
  ];

  const completedCount = checklistItems.filter(item => item.completed).length;
  const progress = (completedCount / checklistItems.length) * 100;
  const allCompleted = completedCount === checklistItems.length;

  // Auto-dismiss checklist when complete
  useEffect(() => {
    if (allCompleted && !checklistDismissed) {
      const timer = setTimeout(() => {
        dismissChecklist();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allCompleted, checklistDismissed]);

  // Don't show if everything is dismissed or complete
  if (welcomeDismissed && (checklistDismissed || allCompleted)) {
    return null;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Welcome Banner - Shows only on first visit */}
      {!welcomeDismissed && (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-foreground z-10"
            onClick={dismissWelcome}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardContent className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-2">
                  {t('onboarding.welcomeTitle', 'Welcome to your startup journey!')}
                </h2>
                <p className="text-muted-foreground max-w-2xl">
                  {t('onboarding.welcomeDescription', 'This platform helps you track progress, connect with mentors, and prepare for investment. Let\'s get you set up in just a few steps.')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button onClick={hasStartup && workspaceId ? () => navigate(`/workspace/${workspaceId}`) : onCreateStartup} className="gap-2">
                  {hasStartup ? t('onboarding.viewWorkspace', 'View Workspace') : t('onboarding.getStarted', 'Get Started')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate('/mentors')}>
                  {t('onboarding.exploreMentors', 'Explore Mentors')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Checklist */}
      {!checklistDismissed && !allCompleted && (
        <Card className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={dismissChecklist}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t('onboarding.checklistTitle', 'Getting Started')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} of {checklistItems.length} {t('common.completed', 'completed')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">{Math.round(progress)}%</span>
              </div>
            </div>
            
            <Progress value={progress} className="h-2 mb-5" />
            
            <div className="space-y-2">
              {checklistItems.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                    item.completed 
                      ? "bg-success/10" 
                      : "bg-muted/50 hover:bg-muted"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                    item.completed
                      ? "bg-success text-success-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  )}>
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      item.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-sm",
                      item.completed && "line-through text-muted-foreground"
                    )}>
                      {item.label}
                    </p>
                    {!item.completed && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {!item.completed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={item.action}
                      className="text-primary hover:text-primary flex-shrink-0"
                    >
                      {item.actionLabel}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Complete Celebration (brief) */}
      {allCompleted && !checklistDismissed && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-success">
                {t('onboarding.allComplete', 'You\'re all set!')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.allCompleteDesc', 'Great job completing your setup. You\'re ready to make progress.')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
