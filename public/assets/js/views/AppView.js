const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const placeholder = 'assets/images/car-placeholder.svg';
const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
export class AppView {
  renderCars(cars) {
    const grid = document.querySelector('#carGrid');
    if (!cars.length) { grid.innerHTML = '<div class="col-12 text-center text-white-50 py-5">Nenhum veículo disponível no momento.</div>'; return; }
    grid.innerHTML = cars.map(car => `<div class="col-md-6 col-xl-4"><article class="car-card"><div class="car-card-image"><img src="${car.image || placeholder}" alt="${this.escape(`${car.brand} ${car.model}`)}" onerror="this.onerror=null;this.src='${placeholder}'"><span class="car-tag">${this.escape(car.category || 'Veículo')}</span></div><div class="car-card-body"><h3>${this.escape(car.brand)} ${this.escape(car.model)}</h3><p>${this.escape(car.description || 'Conforto e praticidade para sua próxima viagem.')}</p><div class="car-meta"><span><i class="bi bi-calendar3"></i>${car.year || '—'}</span><span><i class="bi bi-gear"></i>${this.escape(car.transmission || 'Automático')}</span><span><i class="bi bi-people"></i>${car.seats || 5}</span></div><div class="car-card-bottom"><div class="car-price"><strong>${money(car.dailyRate)}</strong><small> / diária</small></div><button class="btn-rent" data-rent="${car.id}" ${car.available === false ? 'disabled' : ''}>${car.available === false ? 'Indisponível' : 'Reservar'}</button></div></div></article></div>`).join('');
  }
  showHeroCar(car, index, total) {
    if (!car) return;
    const image = document.querySelector('#heroCarImage');
    image.classList.add('changing');
    image.onerror = () => { image.onerror = null; image.src = placeholder; };
    image.src = car.image || placeholder;
    document.querySelector('#heroCarName').textContent = `${car.brand} ${car.model}`;
    document.querySelector('#heroCarPrice').innerHTML = `${money(car.dailyRate)} <small>/ diária</small>`;
    document.querySelector('#heroCounter').textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    image.onload = () => image.classList.remove('changing');
  }
  showRentalForm(car) {
    const form = document.querySelector('#rentalForm');
    document.querySelector('#rentalModalTitle').textContent = 'Solicitar aluguel';
    document.querySelector('#rentalSubmitBtn').textContent = 'Enviar solicitação';
    form.elements.carId.value = car.id;
    form.elements.rentalId.value = '';
    document.querySelector('#selectedCarInfo').innerHTML = `<img src="${car.image || placeholder}" onerror="this.onerror=null;this.src='${placeholder}'" alt=""><div><strong>${this.escape(car.brand)} ${this.escape(car.model)}</strong><small>${money(car.dailyRate)} por diária</small></div>`;
    const start = localDate();
    form.elements.startDate.min = start; form.elements.startDate.value = start;
    const tomorrow = localDate(new Date(Date.now() + 86400000));
    form.elements.endDate.min = tomorrow; form.elements.endDate.value = tomorrow;
    this.updateEstimate(car.dailyRate, start, tomorrow);
  }
  updateEstimate(rate, start, end) {
    const days = Math.max(1, Math.ceil((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000));
    document.querySelector('#rentalEstimate').textContent = money(days * Number(rate));
  }
  escape(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
}
