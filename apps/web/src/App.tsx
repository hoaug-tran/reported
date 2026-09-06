import React from 'react';
import { Route, Switch, Redirect, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { AppLayout } from './components/layout/AppLayout';

import { DashboardPage } from './pages/DashboardPage';
import { PostFeedPage } from './pages/PostFeedPage';
import { IssuesPage } from './pages/IssuesPage';
import { CreateIssuePage } from './pages/CreateIssuePage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { CreateReviewPage } from './pages/CreateReviewPage';
import { ReviewDetailPage } from './pages/ReviewDetailPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { MembersPage } from './pages/MembersPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { LoginPage } from './pages/LoginPage';
import { ConnectedAccountsPage } from './pages/ConnectedAccountsPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { WorkspaceSettingsPage } from './pages/WorkspaceSettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { Box, CircularProgress } from '@mui/material';

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, isLoading } = useAuthContext();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (location.startsWith('/oauth/callback')) {
    return <OAuthCallbackPage />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <WorkspaceProvider>
      <AppLayout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/posts" component={PostFeedPage} />
          <Route path="/issues" component={IssuesPage} />
          <Route path="/issues/new" component={CreateIssuePage} />
          <Route path="/issues/:number" component={IssueDetailPage} />
          <Route path="/reviews" component={ReviewsPage} />
          <Route path="/reviews/new" component={CreateReviewPage} />
          <Route path="/reviews/:number" component={ReviewDetailPage} />
          <Route path="/repositories" component={RepositoriesPage} />
          <Route path="/projects" component={ProjectsPage} />
          <Route path="/members" component={MembersPage} />
          <Route path="/users/:username" component={UserProfilePage} />
          <Route path="/settings/workspace" component={WorkspaceSettingsPage} />
          <Route path="/settings/connected-accounts" component={ConnectedAccountsPage} />
          <Route path="/settings" component={ConnectedAccountsPage} />
          <Route path="/oauth/callback" component={OAuthCallbackPage} />
          <Route path="/login">
            <Redirect to="/" />
          </Route>
          <Route>
            <NotFoundPage />
          </Route>
        </Switch>
      </AppLayout>
    </WorkspaceProvider>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <ProtectedRoutes />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

