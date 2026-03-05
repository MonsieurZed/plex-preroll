/**
 * Client HTTP pour l'API Plex Preroll Manager.
 * Fournit les méthodes d'accès aux endpoints.
 */

const PrerollAPI = {
  async getPrerolls(scheduleId) {
    const params = scheduleId ? "?schedule=" + encodeURIComponent(scheduleId) : "";
    const resp = await fetch("/api/prerolls" + params);
    if (!resp.ok) throw new Error("Erreur " + resp.status);
    return resp.json();
  },

  async savePrerolls(scheduleId, videos, emptyProbability) {
    const resp = await fetch("/api/prerolls", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schedule_id: scheduleId,
        videos: videos,
        empty_probability: emptyProbability,
      }),
    });
    if (!resp.ok) throw new Error("Erreur " + resp.status);
    return resp.json();
  },

  async rescan(scheduleId) {
    const params = scheduleId ? "?schedule=" + encodeURIComponent(scheduleId) : "";
    const resp = await fetch("/api/prerolls/scan" + params, { method: "POST" });
    if (!resp.ok) throw new Error("Erreur " + resp.status);
    return resp.json();
  },

  async getSchedules() {
    const resp = await fetch("/api/schedules");
    if (!resp.ok) throw new Error("Erreur " + resp.status);
    return resp.json();
  },

  async createSchedule(name, start, end, priority) {
    const resp = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, start: start, end: end, priority: priority }),
    });
    if (!resp.ok) throw new Error("Erreur " + resp.status);
    return resp.json();
  },

  async updateSchedule(id, data) {
    const resp = await fetch("/api/schedules/" + encodeURIComponent(id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error("Erreur " + resp.status);
    return resp.json();
  },

  async deleteSchedule(id) {
    const resp = await fetch("/api/schedules/" + encodeURIComponent(id), {
      method: "DELETE",
    });
    if (!resp.ok) throw new Error("Erreur " + resp.status);
  },

  async evaluateSchedules() {
    const resp = await fetch("/api/schedules/evaluate", { method: "POST" });
    if (!resp.ok) throw new Error("Erreur " + resp.status);
    return resp.json();
  },

  async getPlexCurrent() {
    const resp = await fetch("/api/plex/current");
    if (!resp.ok) throw new Error("Erreur " + resp.status);
    return resp.json();
  },
};
