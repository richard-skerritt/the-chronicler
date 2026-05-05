import { Switch, Route, Router } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import LandingPage from '@/pages/LandingPage';
import GamePage from '@/pages/GamePage';
import SettingsPage from '@/pages/SettingsPage';
import CharacterCreatePage from '@/pages/CharacterCreatePage';
import NotFound from '@/pages/not-found';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/"        component={LandingPage} />
            <Route path="/create"  component={CharacterCreatePage} />
            <Route path="/game"    component={GamePage} />
            <Route path="/demo"    component={GamePage} />   {/* demo mode handled inside GamePage */}
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
