import api from "./api";
export const list = async (params = {}, config = {}) =>
  (await api.get("/admin/products", { ...config, params })).data;
export const getById = async (id, config = {}) =>
  (await api.get(`/admin/products/${id}`, config)).data;
export const create = async (payload) =>
  (await api.post("/admin/products", payload)).data;
export const update = async (id, patch) =>
  (await api.put(`/admin/products/${id}`, patch)).data;
export const remove = async (id) =>
  (await api.delete(`/admin/products/${id}`)).data;
export const importCsv = async (rows, options = {}) =>
  (await api.post("/admin/products/import", { rows, ...options })).data;
export const copyFromCountry = async (payload) =>
  (await api.post("/admin/products/copy-from-country", payload)).data;
export const history = async (id, params = {}, config = {}) =>
  (await api.get(`/admin/products/${id}/history`, { ...config, params })).data;
export const exportView = async (params) =>
  (await api.get("/admin/products/export", { params, responseType: "blob" }))
    .data;
export const uploadImage = async (id, file, versions = {}) => {
  const data = new FormData();
  data.append("file", file);
  for (const [key, value] of Object.entries(versions))
    if (value) data.append(key, value);
  return (await api.post(`/admin/products/${id}/image`, data)).data;
};
