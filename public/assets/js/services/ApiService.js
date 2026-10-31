const API_BASE = 'http://localhost:3000';
export class ApiService {
  static async request(resource, options = {}) {
    const response = await fetch(`${API_BASE}/${resource}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (!response.ok) throw new Error(`Falha na API (${response.status}) ao acessar ${resource}.`);
    if (response.status === 204) return null;
    return response.json();
  }
  static get(resource) { return this.request(resource); }
  static post(resource, data) { return this.request(resource, { method: 'POST', body: JSON.stringify(data) }); }
  static patch(resource, id, data) { return this.request(`${resource}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  static delete(resource, id) { return this.request(`${resource}/${id}`, { method: 'DELETE' }); }
}
