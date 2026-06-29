import api from "./api";

export const memorialsService = {
  listTributes: async ({ slug = "livre-blanc", status = "PENDING" } = {}) =>
    (
      await api.get("/admin/memorials/tributes", {
        params: { slug, status },
      })
    ).data,

  saveMemorial: async (body) => (await api.put("/admin/memorials", body)).data,

  updateTributeStatus: async (id, status) =>
    (await api.patch(`/admin/memorials/tributes/${id}/status`, { status })).data,
};
