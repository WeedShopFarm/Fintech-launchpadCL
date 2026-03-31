import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          toast.error('OAuth authorization failed');
          navigate('/dashboard');
          return;
        }

        if (!code) {
          toast.error('No authorization code received');
          navigate('/dashboard');
          return;
        }

        if (!user) {
          toast.error('User not authenticated');
          navigate('/login');
          return;
        }

        // Call the Supabase function to exchange the code for an access token
        const { data, error: functionError } = await supabase.functions.invoke('gocardless-oauth', {
          body: { code },
        });

        if (functionError) {
          console.error('OAuth function error:', functionError);
          toast.error('Failed to complete OAuth authorization');
          navigate('/dashboard');
          return;
        }

        toast.success('GoCardless connected successfully!');
        navigate('/dashboard');
      } catch (err) {
        console.error('OAuth callback error:', err);
        toast.error('An unexpected error occurred');
        navigate('/dashboard');
      } finally {
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <h2 className="text-xl font-semibold">Connecting to GoCardless...</h2>
        <p className="text-muted-foreground">
          Please wait while we complete the authorization process.
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;