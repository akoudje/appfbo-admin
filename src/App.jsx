// src/App.jsx
import { Routes, Route } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Products from "./pages/Products";
import ProductCreate from "./pages/ProductCreate.jsx";
import ProductEdit from "./pages/ProductEdit.jsx";

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
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/new" element={<ProductCreate />} />
                <Route path="/products/:id/edit" element={<ProductEdit />} />
                <Route path="*" element={<div className="p-6">Not found</div>} />
              </Routes>
            </AdminLayout>
          }
        />
      </Route>
    </Routes>
  );
}