import { Lending } from '@/types/expense';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Bell, User, Trash2, Pencil, Phone } from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';

interface LendingListProps {
  lendings: Lending[];
  onMarkReturned: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (lending: Lending) => void;
}

export const LendingList = ({ lendings, onMarkReturned, onDelete, onEdit }: LendingListProps) => {
  const pendingLendings = lendings.filter(l => !l.isReturned);
  const totalPending = pendingLendings.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-warning/10 border-warning/20">
        <p className="text-sm text-muted-foreground">Total Pending</p>
        <p className="text-xl font-bold">₹{totalPending.toLocaleString('en-IN')}</p>
        <p className="text-xs text-muted-foreground">{pendingLendings.length} pending</p>
      </Card>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {pendingLendings.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No pending amounts</p>
        ) : (
          pendingLendings.map((lending) => {
            const isReminderDue = lending.reminderDate && 
              (isToday(new Date(lending.reminderDate)) || isPast(new Date(lending.reminderDate)));

            return (
              <Card key={lending.id} className={`p-3 ${isReminderDue ? 'border-warning bg-warning/5' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{lending.personName}</p>
                        {isReminderDue && (
                          <Badge variant="outline" className="text-warning border-warning text-xs">
                            <Bell className="w-3 h-3 mr-1" />
                            Ask today!
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Given: {format(new Date(lending.givenDate), 'dd MMM yyyy')}
                        {lending.reminderDate && ` • Remind: ${format(new Date(lending.reminderDate), 'dd MMM')}`}
                      </p>
                      {lending.borrowerPhone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {lending.borrowerPhone}
                        </p>
                      )}
                      {lending.note && (
                        <p className="text-xs text-muted-foreground mt-1">{lending.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold">₹{lending.amount.toLocaleString('en-IN')}</p>
                    <div className="flex gap-1 flex-wrap justify-end">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-xs h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => onMarkReturned(lending.id)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Closed
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-xs h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => onEdit(lending)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-xs h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(lending.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
