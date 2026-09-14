import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SuggestedTask, RESEARCHED_FINANCE_TEMPLATES } from '@/lib/smartAutoTodo';
import { Sparkles, AlertCircle, Plus, Check, Compass, CreditCard, ShieldCheck, Zap } from 'lucide-react';

interface SmartTodoDetectorProps {
  detectedTasks: SuggestedTask[];
  onAddTask: (task: {
    title: string;
    description?: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
  }) => void;
  onAddAllDetected: () => void;
}

export const SmartTodoDetector = ({
  detectedTasks,
  onAddTask,
  onAddAllDetected,
}: SmartTodoDetectorProps) => {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [addedTemplateTitles, setAddedTemplateTitles] = useState<Set<string>>(new Set());

  const handleAddTemplate = (template: typeof RESEARCHED_FINANCE_TEMPLATES[0]) => {
    onAddTask({
      title: template.title,
      description: template.description,
      category: template.category,
      priority: template.priority,
    });
    setAddedTemplateTitles(prev => new Set(prev).add(template.title));
  };

  return (
    <div className="space-y-4 mb-6">
      {/* 1. Smart Auto-Detection Banner */}
      {detectedTasks.length > 0 && (
        <Card className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-primary/10 shadow-card hover:shadow-elevated transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl flex-shrink-0 animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base text-foreground">
                    Auto-Detected Missed Items
                  </h3>
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold">
                    {detectedTasks.length} Action Needed
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Smart scan checked your cards, bank balances & lendings to find items requiring attention.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Button
                onClick={onAddAllDetected}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md gap-1.5 text-xs font-semibold w-full sm:w-auto"
              >
                <Zap className="w-4 h-4" />
                Add All ({detectedTasks.length})
              </Button>
              <Button
                onClick={() => setTemplateDialogOpen(true)}
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 text-xs border-amber-500/30 hover:bg-amber-500/10 w-full sm:w-auto"
              >
                <Compass className="w-4 h-4 text-amber-500" />
                Templates
              </Button>
            </div>
          </div>

          {/* Quick preview of detected items */}
          <div className="mt-3 pt-3 border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-2 gap-2">
            {detectedTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-background/60 dark:bg-slate-900/60 border border-amber-500/10 hover:border-amber-500/30 transition-all text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="font-medium truncate">{task.title}</span>
                </div>
                <Button
                  onClick={() => onAddTask(task)}
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 rounded-lg flex-shrink-0"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. When no missed tasks detected, show template launch shortcut */}
      {detectedTasks.length === 0 && (
        <Card className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-blue-500/5 to-transparent flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Everything Caught Up!</h4>
              <p className="text-xs text-muted-foreground">No overdue bills or missing financial tasks found. Need common task templates?</p>
            </div>
          </div>
          <Button
            onClick={() => setTemplateDialogOpen(true)}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5 border-primary/30 hover:bg-primary/10 whitespace-nowrap"
          >
            <Compass className="w-4 h-4 text-primary" />
            Essential Finance To-Dos
          </Button>
        </Card>
      )}

      {/* 3. Researched Templates Library Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Compass className="w-5 h-5 text-primary" />
              Essential Personal Finance To-Dos
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Handpicked productivity routines and financial habits commonly used for maximum money control.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 max-h-[60vh] overflow-y-auto pr-1">
            {RESEARCHED_FINANCE_TEMPLATES.map((tmpl, idx) => {
              const isAdded = addedTemplateTitles.has(tmpl.title);
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-border/60 hover:border-primary/40 bg-card hover:bg-accent/40 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg">{tmpl.icon}</span>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">
                        {tmpl.recommendedTag}
                      </Badge>
                    </div>
                    <h5 className="font-semibold text-xs text-foreground line-clamp-1">{tmpl.title}</h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {tmpl.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className={`text-[10px] font-semibold uppercase ${
                      tmpl.priority === 'high' ? 'text-destructive' : 'text-amber-500'
                    }`}>
                      {tmpl.priority} Priority
                    </span>
                    <Button
                      onClick={() => handleAddTemplate(tmpl)}
                      disabled={isAdded}
                      size="sm"
                      variant={isAdded ? 'ghost' : 'default'}
                      className="h-7 text-xs rounded-xl px-3"
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3 h-3 mr-1 text-success" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 mr-1" /> Add to Todo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
