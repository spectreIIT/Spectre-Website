import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';
import EventLayout from './layouts/EventLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleRoute from './components/common/RoleRoute';
import EventAccessGuard from './components/common/EventAccessGuard';
import { EventProvider, useEvent } from './context/EventContext';

// ── Pages (organized by feature group) ───────────────────────────────────────
// Auth & Public
import LandingPage from './pages/Auth/LandingPage';
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import VerifyEmailPage from './pages/Auth/VerifyEmailPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import NotFound from './pages/Auth/NotFound';

// Admin / Supervisor Panels
import AdminPanel from './pages/Auth/AdminPanel';
import SupervisorPanel from './pages/Auth/SupervisorPanel';
import UserDetailView from './pages/Auth/UserDetailView';

// Dashboard group
import Dashboard from './pages/Dashboard/Dashboard';
import Scoreboard from './pages/Dashboard/Scoreboard';
import Notifications from './pages/Dashboard/Notifications';

// Profile
import Profile from './pages/Profile/Profile';

// Modules
import Modules from './pages/Modules/Modules';
import ModuleReader from './pages/Modules/ModuleReader';
import ModuleEditor from './pages/Modules/ModuleEditor';

// Challenges
import Challenges from './pages/Challenges/Challenges';

// Writeups
import Writeups from './pages/Writeups/Writeups';
import MyWriteups from './pages/Writeups/MyWriteups';
import WriteupDetail from './pages/Writeups/WriteupDetail';
import WriteupCreate from './pages/Writeups/WriteupCreate';

// Events
import EventsHub from './pages/Events/EventsHub';
import EventOverview from './pages/Events/EventOverview';
import EventChallenges from './pages/Events/EventChallenges';
import EventScoreboard from './pages/Events/EventScoreboard';
import EventTeams from './pages/Events/EventTeams';
import EventParticipants from './pages/Events/EventParticipants';
import EventSettings from './pages/Events/EventSettings';
import EventWriteups from './pages/Events/EventWriteups';
import EventNotifications from './pages/Events/EventNotifications';
import EventEditor from './pages/Events/EventEditor';
import EventModules from './pages/Events/EventModules';

const EventArenaRedirect = () => {
  const { event } = useEvent();
  if (!event) return null;
  return <Navigate to={event.eventType === 'module' ? 'modules' : 'challenges'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>
        
        {/* Auth routes (no layout needed) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes (CTF Platform) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/writeups" element={<Writeups />} />
            <Route path="/writeups/my" element={<MyWriteups />} />
            <Route path="/writeups/new" element={<WriteupCreate />} />
            <Route path="/writeups/:id" element={<WriteupDetail />} />
            <Route path="/scoreboard" element={<Scoreboard />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/events" element={<EventsHub />} />
            
            {/* Admin only route */}
            <Route element={<RoleRoute allowedRoles={['Admin']} />}>
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/admin/users/:id" element={<UserDetailView />} />
            </Route>

            {/* Supervisor & Admin route */}
            <Route element={<RoleRoute allowedRoles={['Supervisor']} />}>
              <Route path="/supervisor" element={<SupervisorPanel />} />
              <Route path="/supervisor/users/:id" element={<UserDetailView />} />
            </Route>
          </Route>

          {/* Event Platform Routes */}
          <Route path="/events/:eventId" element={
            <EventProvider>
              <Outlet />
            </EventProvider>
          }>
            <Route index element={<EventOverview />} />
            
            <Route path="arena" element={
              <EventAccessGuard>
                <EventLayout />
              </EventAccessGuard>
            }>
              <Route index element={
                <EventArenaRedirect />
              } />
              <Route path="challenges" element={<EventChallenges />} />
              <Route path="modules" element={<EventModules />} />
              <Route path="scoreboard" element={<EventScoreboard />} />
              <Route path="teams" element={<EventTeams />} />
              <Route path="participants" element={<EventParticipants />} />
              <Route path="notifications" element={<EventNotifications />} />
              <Route path="writeups" element={<EventWriteups />} />
            </Route>
          </Route>

          {/* Module Reader — full screen, no sidebar */}
          <Route path="/modules/:moduleId/section/:sectionIdx" element={<ModuleReader />} />

          {/* Standalone Module Editor — full screen, no sidebar */}
          <Route element={<RoleRoute allowedRoles={['Admin']} />}>
            <Route path="/admin/modules/new" element={<ModuleEditor />} />
            <Route path="/admin/modules/edit/:id" element={<ModuleEditor />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['Supervisor']} />}>
            <Route path="/supervisor/modules/new" element={<ModuleEditor />} />
            <Route path="/supervisor/modules/edit/:id" element={<ModuleEditor />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['Admin']} />}>
            <Route path="/admin/events/new" element={<EventEditor />} />
            <Route path="/admin/events/edit/:id" element={<EventEditor />} />
          </Route>

          {/* Dedicated Admin Event Management Routes */}
          <Route element={<RoleRoute allowedRoles={['Admin']} />}>
            <Route path="/admin/events/:eventId" element={
              <EventProvider>
                <EventLayout />
              </EventProvider>
            }>
              <Route index element={<EventArenaRedirect />} />
              <Route path="challenges" element={<EventChallenges />} />
              <Route path="modules" element={<EventModules />} />
              <Route path="scoreboard" element={<EventScoreboard />} />
              <Route path="teams" element={<EventTeams />} />
              <Route path="participants" element={<EventParticipants />} />
              <Route path="notifications" element={<EventNotifications />} />
              <Route path="writeups" element={<EventWriteups />} />
              <Route path="writeups/:id" element={<WriteupDetail />} />
            </Route>
          </Route>

          {/* Dedicated Supervisor Event Management Routes */}
          <Route element={<RoleRoute allowedRoles={['Supervisor']} />}>
            <Route path="/supervisor/events/:eventId" element={
              <EventProvider>
                <EventLayout />
              </EventProvider>
            }>
              <Route index element={<EventArenaRedirect />} />
              <Route path="challenges" element={<EventChallenges />} />
              <Route path="modules" element={<EventModules />} />
              <Route path="scoreboard" element={<EventScoreboard />} />
              <Route path="teams" element={<EventTeams />} />
              <Route path="participants" element={<EventParticipants />} />
              <Route path="notifications" element={<EventNotifications />} />
              <Route path="writeups" element={<EventWriteups />} />
              <Route path="writeups/:id" element={<WriteupDetail />} />
            </Route>
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
