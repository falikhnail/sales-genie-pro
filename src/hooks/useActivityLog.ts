import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout'
  | 'view'
  | 'export';

export type EntityType = 
  | 'order' 
  | 'store' 
  | 'product' 
  | 'user' 
  | 'price' 
  | 'target'
  | 'report'
  | 'auth';

interface LogActivityParams {
  action: ActivityAction;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
}

export const useActivityLog = () => {
  const { user } = useAuth();

  const logMutation = useMutation({
    mutationFn: async (params: LogActivityParams) => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase.from('activity_logs').insert([{
        user_id: user.id,
        user_name: profile?.full_name || user.email || 'Unknown',
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        entity_name: params.entityName,
        details: params.details as any,
      }]);

      if (error) throw error;
    },
  });

  const logActivity = (params: LogActivityParams) => {
    logMutation.mutate(params);
  };

  return { logActivity };
};