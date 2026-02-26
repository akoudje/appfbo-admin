import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";

import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Products from "./pages/Products";
import ProductCreate from "./pages/ProductCreate.jsx";
import ProductEdit from "./pages/ProductEdit.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/products" element={<Products />} />
          <Route path="/admin/products/new" element={<ProductCreate />} />
          <Route path="/admin/products/:id/edit" element={<ProductEdit />} />

          <Route path="*" element={<div className="p-6">Not found</div>} />
        </Routes>
      </AdminLayout>
    </BrowserRouter>
  );
}
