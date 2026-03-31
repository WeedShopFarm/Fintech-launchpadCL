import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          toast.error('OAuth authorization failed', { description: error });
          navigate('/dashboard');
          return;
        }

        if (!code) {
          toast.error('No authorization code received');
          navigate('/dashboard');
          return;
        }

        if (!user) {
          // User is not logged in — redirect to login, preserve the callback URL
          toast.error('Please sign in first to complete GoCardless connection');
          navigate('/login');
          return;
        }

        const { data, error: functionError } = await supabase.functions.invoke('gocardless-oauth', {
          body: { code },
        });

        if (functionError) {
          console.error('OAuth function error:', functionError);
          toast.error('Failed to complete GoCardless authorization', { description: functionError.message });
          navigate('/dashboard');
          return;
        }

        if (data?.error) {
          toast.error('GoCardless connection failed', { description: data.error });
          navigate('/dashboard');
          return;
        }

        toast.success('GoCardless connected successfully!');
        navigate('/dashboard');
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        toast.error('An unexpected error occurred', { description: err.message });
        navigate('/dashboard');
      } finally {
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, user, authLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Connecting to GoCardless...</h2>
        <p className="text-muted-foreground">
          Please wait while we complete the authorization process.
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;
