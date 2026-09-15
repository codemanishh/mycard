import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Phone, 
  Mail, 
  Save, 
  Loader2, 
  KeyRound, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  UserCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  getAssignmentProfile,
  updateAssignmentProfile,
  refreshAssignmentCode,
  revokeAssigner,
  AllowedAssigner
} from '@/lib/assignmentPermissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  onDataReset?: () => void;
}

export const ProfileDialog = ({ 
  open, 
  onOpenChange, 
  userId, 
  userEmail,
  onDataReset 
}: ProfileDialogProps) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [assignmentCode, setAssignmentCode] = useState('');
  const [allowedAssigners, setAllowedAssigners] = useState<AllowedAssigner[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingCode, setRefreshingCode] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmResetValuesOpen, setConfirmResetValuesOpen] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
    }
  }, [open, userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const p = await getAssignmentProfile(userId, userEmail);
      setFullName(p.full_name || '');
      setAssignmentCode(p.assignment_code || '');
      setAllowedAssigners(p.allowed_assigners || []);

      // Also get phone_number from profiles table
      const { data } = await supabase
        .from('profiles')
        .select('phone_number, full_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        if (data.phone_number) setPhoneNumber(data.phone_number);
        if (data.full_name) setFullName(data.full_name);
      }
    } catch (e) {
      console.error('Error loading profile dialog:', e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAssignmentProfile(userId, {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile details have been saved successfully.',
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  const handleRefreshCode = async () => {
    setRefreshingCode(true);
    try {
      const newCode = await refreshAssignmentCode(userId);
      setAssignmentCode(newCode);
      toast({
        title: 'New Code Generated!',
        description: `Your new 3-digit task assignment OTP is ${newCode}`,
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to refresh code',
        variant: 'destructive',
      });
    }
    setRefreshingCode(false);
  };

  const handleRevokeAssigner = async (emailToRevoke: string) => {
    try {
      const updated = await revokeAssigner(userId, userEmail, emailToRevoke);
      setAllowedAssigners(updated.allowed_assigners);
      toast({
        title: 'Permission Revoked',
        description: `Removed ${emailToRevoke} from your allowed assigners.`,
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to revoke assigner permission',
        variant: 'destructive',
      });
    }
  };

  const handleResetValuesOnly = async () => {
    if (!userId) return;
    setDeletingData(true);
    try {
      // 1. Delete all expenses, lendings, todos
      // 2. Reset credit_cards bills to 0 and clear notes
      // 3. Reset bank_accounts balance to 0
      await Promise.all([
        supabase.from('expenses').delete().eq('user_id', userId),
        supabase.from('lendings').delete().eq('user_id', userId),
        supabase.from('todos').delete().eq('user_id', userId),
        supabase.from('credit_cards').update({ current_bill: 0, notes: '' }).eq('user_id', userId),
        supabase.from('bank_accounts').update({ balance: 0 }).eq('user_id', userId),
      ]);

      // Clear local storage keys for last paid dates & queues
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('card_last_paid_') || key.startsWith('offline_queue')) {
            localStorage.removeItem(key);
          }
        });
      }

      toast({
        title: 'Balances & History Reset! 🔄',
        description: 'All credit card bills, bank balances, and transaction history reset to 0.',
      });

      setConfirmResetValuesOpen(false);
      onOpenChange(false);

      if (onDataReset) {
        onDataReset();
      }
    } catch (err: any) {
      toast({
        title: 'Error Resetting Values',
        description: err?.message || 'Failed to reset values.',
        variant: 'destructive',
      });
    } finally {
      setDeletingData(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!userId) return;
    setDeletingData(true);
    try {
      // Delete all user data in Supabase tables
      await Promise.all([
        supabase.from('expenses').delete().eq('user_id', userId),
        supabase.from('credit_cards').delete().eq('user_id', userId),
        supabase.from('bank_accounts').delete().eq('user_id', userId),
        supabase.from('lendings').delete().eq('user_id', userId),
        supabase.from('todos').delete().eq('user_id', userId),
        supabase.from('profiles').delete().eq('user_id', userId),
      ]);

      // Clear local storage keys related to card payment dates & queues
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('card_last_paid_') || key.startsWith('offline_queue')) {
            localStorage.removeItem(key);
          }
        });
      }

      toast({
        title: 'Profile & Data Reset Complete 🧹',
        description: 'All your cards, transactions, and account records have been permanently deleted.',
      });

      setConfirmResetOpen(false);
      onOpenChange(false);

      if (onDataReset) {
        onDataReset();
      }
    } catch (err: any) {
      toast({
        title: 'Error Resetting Data',
        description: err?.message || 'Failed to delete user data.',
        variant: 'destructive',
      });
    } finally {
      setDeletingData(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border-border/50 shadow-elevated p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <User className="w-5 h-5 text-primary" />
              Profile & Task Settings
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Display Name */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-xs font-semibold">
                  <User className="w-4 h-4 text-primary" />
                  Display Name
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Manish Sharma"
                  className="rounded-xl text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  This name will be displayed on tasks assigned to/by you.
                </p>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-xs font-semibold">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  value={userEmail}
                  disabled
                  className="rounded-xl bg-muted/60 text-sm font-medium"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-xs font-semibold">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  WhatsApp Number
                </Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g., 919771999170"
                  className="rounded-xl text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Include country code (e.g. 91 for India).
                </p>
              </div>

              {/* 3-Digit Assignment Code Box */}
              <div className="p-3.5 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Task Assignment Passcode (3-Digit OTP)</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshCode}
                    disabled={refreshingCode}
                    className="h-7 px-2 text-xs rounded-lg border-primary/30 hover:bg-primary/10"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${refreshingCode ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                <div className="flex items-center justify-between bg-card p-2.5 rounded-xl border border-border/50">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Your 3-Digit Code:</p>
                    <p className="text-xl font-extrabold tracking-widest text-primary font-mono">{assignmentCode || '---'}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Required for 1st Assignment
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Share this code with others so they can assign tasks to you for the first time.
                </p>
              </div>

              {/* Allowed Assigners List */}
              <div className="p-3.5 bg-muted/40 border border-border/60 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-foreground">Allowed Assigners</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {allowedAssigners.length} Approved
                  </Badge>
                </div>

                {allowedAssigners.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No assigners added yet. When someone uses your 3-digit code, they will appear here.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {allowedAssigners.map((assigner) => (
                      <div
                        key={assigner.email}
                        className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/40 text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-semibold text-foreground truncate">
                            {assigner.full_name || assigner.email.split('@')[0]}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{assigner.email}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRevokeAssigner(assigner.email)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0"
                          title="Revoke Permission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full rounded-xl"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>

              {/* Danger Zone / Reset Options */}
              <div className="pt-2 border-t border-border/40">
                <div className="p-3.5 bg-red-500/5 dark:bg-red-500/10 border border-red-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider">Reset & Danger Zone</span>
                  </div>

                  <div className="space-y-2">
                    {/* Option 1: Reset Values & History Only (Keep Cards & Accounts) */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmResetValuesOpen(true)}
                      disabled={deletingData}
                      className="w-full rounded-xl h-9 text-xs font-bold gap-2 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Balances & Clear History (Keep Cards)
                    </Button>

                    {/* Option 2: Delete Everything */}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmResetOpen(true)}
                      disabled={deletingData}
                      className="w-full rounded-xl h-9 text-xs font-bold gap-2 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Everything & Reset Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Resetting Balances & History Only */}
      <AlertDialog open={confirmResetValuesOpen} onOpenChange={setConfirmResetValuesOpen}>
        <AlertDialogContent className="rounded-3xl max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 shrink-0" />
              Reset Balances & Clear History?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2 pt-2">
              <span className="block text-foreground font-semibold">
                Your credit cards & bank account names will NOT be deleted.
              </span>
              <span className="block pt-1">
                This will reset all numerical values & clear history:
              </span>
              <span className="block pl-2 space-y-1 text-foreground/80 font-medium">
                • Credit card current & overdue bills reset to ₹0<br />
                • Bank account balances reset to ₹0<br />
                • All transaction & expense history erased<br />
                • All lendings & to-dos cleared
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl flex-1 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetValuesOnly}
              disabled={deletingData}
              className="rounded-xl flex-1 text-xs bg-amber-600 text-white hover:bg-amber-700 font-bold"
            >
              {deletingData ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Yes, Reset Balances & History'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Deleting Everything */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent className="rounded-3xl max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Reset Profile & Delete All Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2 pt-2">
              <span className="block text-foreground font-semibold">
                This action CANNOT be undone.
              </span>
              <span className="block pt-1">
                The following records will be permanently erased:
              </span>
              <span className="block pl-2 space-y-1 text-foreground/80 font-medium">
                • All registered credit cards & bank accounts<br />
                • All expense transactions & payment history<br />
                • All lendings & borrower records<br />
                • All to-do list items<br />
                • Your saved profile settings
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl flex-1 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllData}
              disabled={deletingData}
              className="rounded-xl flex-1 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {deletingData ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete Everything'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


