import { Lending } from '@/types/expense';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { SwipeableItem } from './SwipeableItem';

interface LendingHistoryProps {
  lendings: Lending[];
  onDelete: (id: string) => void;
}

export const LendingHistory = ({ lendings, onDelete }: LendingHistoryProps) => {
  const closedLendings = lendings.filter(l => l.isReturned);
  const totalReturned = closedLendings.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-success/10 border-success/20">
        <p className="text-sm text-muted-foreground">Total Returned</p>
        <p className="text-xl font-bold text-success">₹{totalReturned.toLocaleString('en-IN')}</p>
        <p className="text-xs text-muted-foreground">{closedLendings.length} closed</p>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Swipe left to delete
      </p>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {closedLendings.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No closed lendings yet</p>
        ) : (
          closedLendings.map((lending) => (
            <SwipeableItem key={lending.id} onDelete={() => onDelete(lending.id)}>
              <Card className="p-3 border-success/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{lending.personName}</p>
                        <Badge variant="outline" className="text-success border-success text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Returned
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Given: {format(new Date(lending.givenDate), 'dd MMM yyyy')}
                      </p>
                      {lending.note && (
                        <p className="text-xs text-muted-foreground mt-1">{lending.note}</p>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold text-success">₹{lending.amount.toLocaleString('en-IN')}</p>
                </div>
              </Card>
            </SwipeableItem>
          ))
        )}
      </div>
    </div>
  );
};
