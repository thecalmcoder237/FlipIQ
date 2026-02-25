import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Shield, History, Users, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Breadcrumb from '@/components/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AdminDashboard = () => {
  const { currentUser, isAdmin, loading, profile } = useAuth();
  const navigate = useNavigate();

  if (!loading && !currentUser) {
    navigate('/login');
    return null;
  }

  if (!loading && currentUser && !isAdmin) {
    navigate('/');
    return null;
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted px-4 py-8 sm:px-8">
      <Helmet><title>Admin Dashboard | FlipIQ</title></Helmet>
      <div className="max-w-4xl mx-auto">
        <Breadcrumb />
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage and regulate the app. You are signed in as an administrator.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border bg-card shadow-sm hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Deal History (All Users)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View, edit, update status, and delete any deal across all users. Your changes preserve ownership when editing another user&apos;s deal.
              </p>
              <Button onClick={() => navigate('/deal-history')} className="w-full sm:w-auto">
                Open Deal History
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                User &amp; Role Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Admin privileges are stored in <code className="text-xs bg-muted px-1.5 py-0.5 rounded">profiles.role</code>. Use Supabase Dashboard or SQL to assign <code className="text-xs bg-muted px-1.5 py-0.5 rounded">role = &apos;admin&apos;</code> for other users.
              </p>
              <Button variant="outline" onClick={() => navigate('/deal-history')} className="w-full sm:w-auto" disabled>
                Coming soon
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Admin Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <ul className="list-disc list-inside space-y-1">
                <li>View all deals in Deal History (All deals) and filter by user.</li>
                <li>Edit any deal from Deal Analysis: update fields, Fetch Intelligence, Rehab SOW, etc. Ownership stays with the original user.</li>
                <li>Change status, favorite, and delete any deal from Deal History.</li>
                <li>Access this Admin Dashboard (visible only to <code className="bg-muted px-1 rounded">profiles.role = &apos;admin&apos;</code>).</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
