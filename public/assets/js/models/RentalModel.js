import { ApiService } from '../services/ApiService.js';
export class RentalModel {
  async getByUser(userId) { return ApiService.get('rentals', `?userId=${userId}&_sort=id&_order=desc`); }
  async create(data) { return ApiService.post('rentals', data); }
  async update(id, data) { return ApiService.patch('rentals', id, data); }
  async getAll() { return ApiService.get('rentals', '?_sort=id&_order=desc'); }
  async cancel(id) { return ApiService.patch('rentals', id, { status: 'cancelled' }); }
}
