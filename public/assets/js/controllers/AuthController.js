import { UserModel } from '../models/UserModel.js';
export class AuthController {
  constructor(onChange, notify) { this.model = new UserModel(); this.onChange = onChange; this.notify = notify; this.mode = 'login'; }
  restore() {
    try {
      const user = JSON.parse(localStorage.getItem('verticeUser'));
      if (user?.id) {
        delete user.password;
        localStorage.setItem('verticeUser', JSON.stringify(user));
        this.onChange(user);
      }
    } catch {
      localStorage.removeItem('verticeUser');
    }
  }
  setMode(mode) {
    this.mode = mode;
    document.querySelector('#loginTab').classList.toggle('active', mode === 'login');
    document.querySelector('#registerTab').classList.toggle('active', mode === 'register');
    document.querySelector('#nameField').classList.toggle('d-none', mode !== 'register');
    document.querySelector('#roleField').classList.toggle('d-none', mode !== 'register');
    document.querySelector('#authTitle').textContent = mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta';
    document.querySelector('#authSubmit').textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
    document.querySelector('#authForm').elements.name.required = mode === 'register';
  }
  async submit(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      let user;
      if (this.mode === 'login') user = await this.model.authenticate(data.email, data.password);
      else {
        const users = await this.model.getAll();
        if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) throw new Error('Este e-mail já está cadastrado.');
        const employers = [1,2,3].filter(n => data[`employer${n}`]).map(n => ({ name: data[`employer${n}`], income: Number(data[`income${n}`] || 0) }));
        user = await this.model.create({ ...data, role: data.role || 'client', employers });
      }
      const safeUser = { ...user }; delete safeUser.password;
      localStorage.setItem('verticeUser', JSON.stringify(safeUser)); this.onChange(safeUser);
      bootstrap.Modal.getOrCreateInstance(document.querySelector('#authModal')).hide(); form.reset(); this.setMode('login'); this.notify(`Bem-vindo, ${safeUser.name.split(' ')[0]}!`);
    } catch (error) { this.notify(error.message || 'Não foi possível autenticar.'); }
  }
  logout() { localStorage.removeItem('verticeUser'); this.onChange(null); this.notify('Você saiu da sua conta.'); }
}
