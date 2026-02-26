// src/services/productsService.js
import api from "./api";

export const list = async (params) => {
  // params peut maintenant contenir: q, actif, take, category, inStock
  const res = await api.get("/admin/products", { params });
  return res.data;
};

export const getById = async (id) => {
  const res = await api.get(`/admin/products/${id}`);
  return res.data;
};

export const create = async (payload) => {
  // payload: sku, nom, prixBaseFcfa, cc, poidsKg, actif, imageUrl?,
  // + category?, details?, stockQty?
  const res = await api.post("/admin/products", payload);
  return res.data;
};

export const update = async (id, patch) => {
  // patch: champs partiels, y compris category/details/stockQty
  const res = await api.put(`/admin/products/${id}`, patch);
  return res.data;
};

export const importCsv = async (rows) => {
  // rows doivent aussi pouvoir inclure category/details/stockQty (optionnel)
  const res = await api.post("/admin/products/import", { rows });
  return res.data;
};

export const uploadImage = async (id, file) => {
  const form = new FormData();
  form.append("image", file); // multer attend "image"

  const res = await api.post(`/admin/products/${id}/image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const remove = async (id) => {
  const res = await api.delete(`/admin/products/${id}`);
  return res.data;
};