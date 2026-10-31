import { ApiService } from '../services/ApiService.js';
export class CarModel {
  getAll() { return ApiService.get('cars'); }
  create(data) { return ApiService.post('cars', data); }
  update(id, data) { return ApiService.patch('cars', id, data); }
  delete(id) { return ApiService.delete('cars', id); }
}
