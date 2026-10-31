import { ApiService } from '../services/ApiService.js';
import { CarModel } from '../models/CarModel.js';

const localDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export class RentalController {
  constructor(_unused, view, getUser, notify) { this.view = view; this.getUser = getUser; this.notify = notify; this.carModel = new CarModel(); }
  async create(form) {
    try {
      const user = this.getUser();
      if (!user) throw new Error('Entre para solicitar ou atualizar um aluguel.');
      if (user.role === 'agent') throw new Error('Agentes não podem editar pedidos como clientes.');
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.startDate || !data.endDate || data.endDate <= data.startDate) {
        throw new Error('A devolução deve ocorrer depois da retirada.');
      }
      const cars = await this.carModel.getAll();
      const car = cars.find(c => String(c.id) === String(data.carId));
      if (!car || car.available === false) throw new Error('Este veículo não está disponível.');
      const days = Math.max(1, Math.ceil((new Date(`${data.endDate}T12:00:00`) - new Date(`${data.startDate}T12:00:00`)) / 86400000));
      const rentalData = {
        carId: car.id,
        carName: `${car.brand} ${car.model}`,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes || '',
        total: days * Number(car.dailyRate)
      };

      if (data.rentalId) {
        const all = await ApiService.get('rentals');
        const existing = all.find(item => String(item.id) === String(data.rentalId));
        if (!existing || String(existing.userId) !== String(user.id)) throw new Error('Pedido não encontrado para esta conta.');
        if (existing.status !== 'pending') throw new Error('Somente pedidos pendentes podem ser atualizados.');
        await ApiService.patch('rentals', data.rentalId, rentalData);
        this.notify('Ordem de serviço atualizada com sucesso.');
      } else {
        await ApiService.post('rentals', {
          ...rentalData,
          userId: user.id,
          userName: user.name,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        this.notify('Solicitação enviada para análise.');
      }
      bootstrap.Modal.getOrCreateInstance(document.querySelector('#rentalModal')).hide();
      form.reset();
      form.elements.rentalId.value = '';
      document.querySelector('#rentalModalTitle').textContent = 'Solicitar aluguel';
      document.querySelector('#rentalSubmitBtn').textContent = 'Enviar solicitação';
      return true;
    } catch (error) {
      this.notify(error.message || 'Não foi possível salvar o pedido.');
      return false;
    }
  }
  async edit(id) {
    try {
      const user = this.getUser();
      if (!user || user.role === 'agent') return;
      const all = await ApiService.get('rentals');
      const rental = all.find(item => String(item.id) === String(id) && String(item.userId) === String(user.id));
      if (!rental) throw new Error('Pedido não encontrado.');
      if (rental.status !== 'pending') throw new Error('Somente pedidos pendentes podem ser atualizados.');
      const cars = await this.carModel.getAll();
      const car = cars.find(item => String(item.id) === String(rental.carId));
      if (!car) throw new Error('O veículo deste pedido não foi encontrado.');
      const form = document.querySelector('#rentalForm');
      this.view.showRentalForm(car);
      // Reaplica os dados do pedido após preparar a prévia do veículo.
      form.elements.rentalId.value = rental.id;
      form.elements.startDate.value = rental.startDate;
      form.elements.startDate.min = rental.startDate < localDateString() ? rental.startDate : localDateString();
      form.elements.endDate.value = rental.endDate;
      form.elements.endDate.min = rental.startDate;
      form.elements.notes.value = rental.notes || '';
      this.view.updateEstimate(car.dailyRate, rental.startDate, rental.endDate);
      document.querySelector('#rentalModalTitle').textContent = 'Atualizar ordem de serviço';
      document.querySelector('#rentalSubmitBtn').textContent = 'Salvar alterações';
      bootstrap.Modal.getOrCreateInstance(document.querySelector('#rentalsModal')).hide();
      bootstrap.Modal.getOrCreateInstance(document.querySelector('#rentalModal')).show();
    } catch (error) {
      this.notify(error.message || 'Não foi possível abrir este pedido.');
    }
  }
  async openPanel() {
    try {
      const user = this.getUser(); if (!user) return;
      const all = await ApiService.get('rentals'); const rentals = user.role === 'agent' ? all : all.filter(r => String(r.userId) === String(user.id));
      document.querySelector('#rentalsTitle').textContent = user.role === 'agent' ? 'Pedidos de aluguel' : 'Meus pedidos';
      const host = document.querySelector('#rentalsContent');
      host.innerHTML = rentals.length ? rentals.map(r => `<article class="rental-item"><div class="rental-item-top"><div><h6>${this.view.escape(r.carName)}</h6><p>${this.view.escape(r.userName || '')} · ${r.startDate} até ${r.endDate}</p><p>Total: ${Number(r.total).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p></div><span class="status status-${r.status}">${r.status === 'pending' ? 'Pendente' : r.status === 'approved' ? 'Aprovado' : r.status === 'rejected' ? 'Reprovado' : 'Cancelado'}</span></div><div class="agent-actions">${user.role === 'agent' && r.status === 'pending' ? `<button class="btn btn-success" data-decision="approved" data-id="${r.id}">Aprovar</button><button class="btn btn-outline-danger" data-decision="rejected" data-id="${r.id}">Reprovar</button>` : ''}${user.role !== 'agent' && r.status === 'pending' ? `<button class="btn btn-accent" data-edit="${r.id}">Atualizar pedido</button><button class="btn btn-outline-danger" data-cancel="${r.id}">Cancelar</button>` : ''}</div></article>`).join('') : '<div class="empty-state">Nenhum pedido encontrado.</div>';
      bootstrap.Modal.getOrCreateInstance(document.querySelector('#rentalsModal')).show();
    } catch (error) { this.notify(error.message); }
  }
  async decide(id, status) { try { await ApiService.patch('rentals', id, { status }); this.notify('Pedido atualizado.'); await this.openPanel(); } catch(e) { this.notify(e.message); } }
  async cancel(id) { try { await ApiService.patch('rentals', id, { status: 'cancelled' }); this.notify('Pedido cancelado.'); await this.openPanel(); } catch(e) { this.notify(e.message); } }
}
