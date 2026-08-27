import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { AdminLayout } from "./Layout";
import Login from "./Login";
import { Spinner } from "@/components/Feedback";

const Dashboard = lazy(() => import("./Dashboard"));
const Artworks = lazy(() => import("./Artworks"));
const ArtworkForm = lazy(() => import("./ArtworkForm"));
const MediaLibrary = lazy(() => import("./MediaLibrary"));
const ThemeStudio = lazy(() => import("./ThemeStudio"));
const PageBuilder = lazy(() => import("./PageBuilder"));
const NavigationAdmin = lazy(() => import("./Navigation"));
const Messages = lazy(() => import("./Messages"));
const Settings = lazy(() => import("./Settings"));

function Guarded() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="بررسی دسترسی…" />;
  if (!user) return <Login />;
  if (!user.isStaff) {
    return (
      <div className="p-10 text-center">این حساب دسترسی مدیریت ندارد.</div>
    );
  }
  return (
    <AdminLayout>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="artworks" element={<Artworks />} />
          <Route path="artworks/new" element={<ArtworkForm />} />
          <Route path="artworks/:id" element={<ArtworkForm />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="themes" element={<ThemeStudio />} />
          <Route path="pages" element={<PageBuilder />} />
          <Route path="navigation" element={<NavigationAdmin />} />
          <Route path="messages" element={<Messages />} />
          <Route path="branding" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin-panel" replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <Guarded />
    </AuthProvider>
  );
}
