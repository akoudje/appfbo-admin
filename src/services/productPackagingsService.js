// src/services/productPackagingsService.js
import api from "./api";

export const list = async (productId) => {
  const res = await api.get(`/admin/products/${productId}/packagings`);
  return res.data;
};

export const create = async (productId, payload) => {
  // payload: label, unitsPerPackage, barcode?, prixFcfa?, actif?
  const res = await api.post(`/admin/products/${productId}/packagings`, payload);
  return res.data;
};

export const update = async (productId, packagingId, patch) => {
  const res = await api.put(
    `/admin/products/${productId}/packagings/${packagingId}`,
    patch,
  );
  return res.data;
};

export const remove = async (productId, packagingId) => {
  const res = await api.delete(
    `/admin/products/${productId}/packagings/${packagingId}`,
  );
  return res.data;
};
