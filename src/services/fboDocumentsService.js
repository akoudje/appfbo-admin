import api from "./api";

export const fboDocumentsService = {
  listSignatories: async (all = false) =>
    (await api.get("/admin/fbo-documents/signatories", { params: all ? { all: 1 } : undefined })).data,

  createSignatory: async (body = {}) =>
    (await api.post("/admin/fbo-documents/signatories", body)).data,

  updateSignatory: async (id, body = {}) =>
    (await api.patch(`/admin/fbo-documents/signatories/${id}`, body)).data,

  deleteSignatory: async (id) =>
    (await api.delete(`/admin/fbo-documents/signatories/${id}`)).data,

  searchFbos: async (q) =>
    (await api.get("/admin/fbo-documents/fbos", { params: { q } })).data,

  listDocuments: async (params = {}) =>
    (await api.get("/admin/fbo-documents", { params })).data,

  createDocument: async (body = {}) =>
    (await api.post("/admin/fbo-documents", body)).data,

  cancelDocument: async (id, body = {}) =>
    (await api.post(`/admin/fbo-documents/${id}/cancel`, body)).data,
};
