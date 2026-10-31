import { ApiService } from '../services/ApiService.js';
export class UserModel {
  getAll() { return ApiService.get('users'); }
  async authenticate(email, password) {
    const users = await ApiService.get(`users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
    if (!users.length) throw new Error('E-mail ou senha inválidos.');
    return users[0];
  }
  create(data) { return ApiService.post('users', data); }
  update(id, data) { return ApiService.patch('users', id, data); }
  delete(id) { return ApiService.delete('users', id); }
}
