import { CarModel } from '../models/CarModel.js';
export class CarController {
  constructor(view, onRent, notify) { this.model = new CarModel(); this.view = view; this.onRent = onRent; this.notify = notify; this.cars = []; this.filtered = []; this.index = 0; }
  async init() {
    const grid = document.querySelector('#carGrid');
    try {
      this.cars = await this.model.getAll();
      this.filtered = this.cars.filter(car => car.available !== false);
      if (!this.filtered.length) this.filtered = [...this.cars];
      this.index = Math.min(this.index, Math.max(0, this.filtered.length - 1));
      this.view.renderCars(this.filtered); this.show(this.index);
    } catch (error) {
      grid.innerHTML = `<div class="col-12 text-center py-5"><p class="text-warning">Não foi possível carregar a frota. Verifique se o JSON Server está ativo em http://localhost:3000.</p><button class="btn btn-outline-light" id="retryCars">Tentar novamente</button></div>`;
      document.querySelector('#retryCars')?.addEventListener('click', () => this.init());
      this.notify(error.message);
    }
  }
  show(index) {
    if (!this.filtered.length) return;
    this.index = (index + this.filtered.length) % this.filtered.length;
    this.view.showHeroCar(this.filtered[this.index], this.index, this.filtered.length);
  }
  rent(id) { const car = this.cars.find(item => String(item.id) === String(id)); if (car) this.onRent(car); }
  filter(category) {
    this.filtered = this.cars.filter(car => car.available !== false && (category === 'all' || car.category === category));
    this.index = 0; this.view.renderCars(this.filtered); this.show(0);
  }
}
