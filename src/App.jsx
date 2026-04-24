// admin-app/src/App.jsx
// Point d'entrée de l'application, définissant les routes principales et intégrant le layout admin.

import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import RequirePermission from "./components/auth/RequirePermission";
import { AdminRole, Permission } from "./auth/permissions";
import useAdminAuth from "./hooks/useAdminAuth";
import { getDefaultWorkspaceRoute, shouldShowDashboard } from "./auth/workspaces";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OrderDetailPage from "./pages/OrderDetailPage";
import BillingQueuePage from "./pages/billing/BillingQueuePage";
import PreparationQueuePage from "./pages/preparation/PreparationQueuePage";
import StockWorkspacePage from "./pages/stock/StockWorkspacePage";
import Products from "./pages/Products";
import ProductCreate from "./pages/ProductCreate.jsx";
import ProductEdit from "./pages/ProductEdit.jsx";
import AdminGradeDiscountsPage from "./pages/AdminGradeDiscountsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import OrdersListPage from "./pages/OrdersListPage";
import CashierWorkspacePage from "./pages/CashierWorkspacePage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import MarketingCampaignsPage from "./pages/MarketingCampaignsPage";

function AccessDenied({ message = "Accès refusé." }) {
  return (
    <div className="p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {message}
      </div>
    </div>
  );
}

function WorkspaceHome() {
  const { role } = useAdminAuth();
  return <Navigate to={getDefaultWorkspaceRoute(role)} replace />;
}

function DashboardHome() {
  const { role } = useAdminAuth();
  if (!shouldShowDashboard(role)) {
    return <Navigate to={getDefaultWorkspaceRoute(role)} replace />;
  }
  return <Dashboard />;
}

function MarketingCampaignsRoute() {
  const { role } = useAdminAuth();
  const allowedRoles = new Set([
    AdminRole.SUPER_ADMIN,
    AdminRole.TECH_ADMIN,
    AdminRole.OPERATIONS_DIRECTOR,
    AdminRole.SALES_DIRECTOR,
    AdminRole.MARKETING_ASSISTANT,
  ]);

  if (!allowedRoles.has(role)) {
    return <AccessDenied message="Accès refusé aux campagnes marketing." />;
  }

  return (
    <RequirePermission
      permission={Permission.COUNTRY_READ}
      fallback={<AccessDenied message="Accès refusé aux campagnes marketing." />}
    >
      <MarketingCampaignsPage />
    </RequirePermission>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="*"
          element={
            <AdminLayout>
              <Routes>
                <Route path="/" element={<WorkspaceHome />} />
                <Route path="/dashboard" element={<DashboardHome />} />

                <Route
                  path="/orders"
                  element={
                    <RequirePermission
                      permission={Permission.PREORDER_READ}
                      fallback={<AccessDenied message="Accès refusé aux commandes." />}
                    >
                      <OrdersListPage />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/orders/:id"
                  element={
                    <RequirePermission
                      permission={Permission.PREORDER_READ}
                      fallback={<AccessDenied message="Accès refusé au détail de commande." />}
                    >
                      <OrderDetailPage />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/billing"
                  element={
                    <RequirePermission
                      permission={Permission.INVOICE_CREATE}
                      fallback={<AccessDenied message="Accès refusé à la file de facturation." />}
                    >
                      <BillingQueuePage />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/cashier"
                  element={
                    <RequirePermission
                      permission={Permission.PAYMENT_VALIDATE}
                      fallback={<AccessDenied message="Accès refusé à l’espace caisse." />}
                    >
                      <CashierWorkspacePage />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/preparation"
                  element={
                    <RequirePermission
                      permission={Permission.PREPARATION_UPDATE}
                      fallback={<AccessDenied message="Accès refusé à la file de préparation." />}
                    >
                      <PreparationQueuePage />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/stock"
                  element={
                    <RequirePermission
                      permission={Permission.PRODUCT_READ}
                      fallback={<AccessDenied message="Accès refusé à l’espace stock." />}
                    >
                      <StockWorkspacePage />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/products"
                  element={
                    <RequirePermission
                      permission={Permission.PRODUCT_READ}
                      fallback={<AccessDenied message="Accès refusé aux produits." />}
                    >
                      <Products />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/products/new"
                  element={
                    <RequirePermission
                      permission={Permission.PRODUCT_WRITE}
                      fallback={<AccessDenied message="Accès refusé à la création produit." />}
                    >
                      <ProductCreate />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/products/:id/edit"
                  element={
                    <RequirePermission
                      permission={Permission.PRODUCT_WRITE}
                      fallback={<AccessDenied message="Accès refusé à l’édition produit." />}
                    >
                      <ProductEdit />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/settings/grade-discounts"
                  element={
                    <RequirePermission
                      permission={Permission.DISCOUNT_READ}
                      fallback={<AccessDenied message="Accès refusé aux remises par grade." />}
                    >
                      <AdminGradeDiscountsPage />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/settings/users"
                  element={
                    <RequirePermission
                      permission={Permission.USER_ADMIN}
                      fallback={<AccessDenied message="Accès refusé aux utilisateurs." />}
                    >
                      <AdminUsersPage />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/settings"
                  element={
                    <RequirePermission
                      permission={Permission.COUNTRY_WRITE}
                      fallback={<AccessDenied message="Accès refusé aux paramètres." />}
                    >
                      <AdminSettingsPage />
                    </RequirePermission>
                  }
                />

                <Route
                  path="/marketing/campaigns"
                  element={<MarketingCampaignsRoute />}
                />

                <Route path="*" element={<div className="p-6">Not found</div>} />
              </Routes>
            </AdminLayout>
          }
        />
      </Route>
    </Routes>
  );
}
