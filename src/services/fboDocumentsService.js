import api from "./api";

export const fboDocumentsService = {
  searchFbos: async (q) =>
    (await api.get("/admin/fbo-documents/fbos", { params: { q } })).data,

  listDocuments: async (params = {}) =>
    (await api.get("/admin/fbo-documents", { params })).data,

  createDocument: async (body = {}) =>
    (await api.post("/admin/fbo-documents", body)).data,

  cancelDocument: async (id, body = {}) =>
    (await api.post(`/admin/fbo-documents/${id}/cancel`, body)).data,
};
