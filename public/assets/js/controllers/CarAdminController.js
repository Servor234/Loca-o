import { CarModel } from '../models/CarModel.js';
const $ = selector => document.querySelector(selector);
const money = value => Number(value || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 });
const fallback = 'assets/images/car-placeholder.svg';
export class CarAdminController {
  constructor(notify, onChange) {
    this.model = new CarModel(); this.notify = notify; this.onChange = onChange; this.imageData = '';
    this.form = $('#carAdminForm'); this.bind(); this.loadFipeBrands();
  }
  bind() {
    const zone = $('#carUploadZone'), file = $('#carImageFile');
    zone.addEventListener('click', e => { if (e.target.id !== 'changeCarImage') file.click(); });
    $('#changeCarImage').addEventListener('click', e => { e.stopPropagation(); file.click(); });
    file.addEventListener('change', () => this.readImage(file.files[0]));
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); this.readImage(e.dataTransfer.files[0]); });
    this.form.addEventListener('submit', e => { e.preventDefault(); this.save(); });
    $('#resetCarForm').addEventListener('click', () => setTimeout(() => this.reset(), 0));
    $('#cancelCarEdit').addEventListener('click', () => this.reset());
    $('#agentCarList').addEventListener('click', e => {
      const edit = e.target.closest('[data-car-edit]'), del = e.target.closest('[data-car-delete]');
      if (edit) this.edit(edit.dataset.carEdit);
      if (del) this.remove(del.dataset.carDelete);
    });
    $('#carZipCode').addEventListener('blur', () => this.lookupCep());
    $('input[name="brand"]').addEventListener('change', () => this.loadFipeModels());
  }
  async load() { await this.renderInventory(); }
  async renderInventory() {
    const list = $('#agentCarList'); list.innerHTML = '<p class="form-hint">Carregando veículos...</p>';
    try {
      const cars = await this.model.getAll();
      $('#inventoryCount').textContent = cars.length;
      $('#agentStats').innerHTML = `<div class="col-6 col-lg-3"><div class="agent-stat"><strong>${cars.length}</strong><small>Veículos cadastrados</small></div></div><div class="col-6 col-lg-3"><div class="agent-stat"><strong>${cars.filter(c=>c.available !== false).length}</strong><small>Disponíveis</small></div></div><div class="col-6 col-lg-3"><div class="agent-stat"><strong>${cars.filter(c=>c.available === false).length}</strong><small>Indisponíveis</small></div></div><div class="col-6 col-lg-3"><div class="agent-stat"><strong>${cars.filter(c=>c.image || c.imageData).length}</strong><small>Com imagem</small></div></div>`;
      list.innerHTML = cars.length ? cars.map(car => `<div class="agent-car-item"><img src="${car.imageData || car.image || fallback}" onerror="this.onerror=null;this.src='${fallback}'" alt=""><div class="agent-car-details"><strong>${this.escape(car.brand)} ${this.escape(car.model)}</strong><small>${this.escape(car.plate || 'Sem placa')} · ${money(car.dailyRate)}/dia</small><span class="inventory-status ${car.available === false ? 'offline' : ''}">${car.available === false ? 'Indisponível' : 'Disponível'}</span></div><div class="agent-car-actions"><button class="btn btn-sm btn-outline-light" data-car-edit="${car.id}" aria-label="Editar">✎</button><button class="btn btn-sm btn-outline-danger" data-car-delete="${car.id}" aria-label="Excluir">×</button></div></div>`).join('') : '<p class="form-hint">Nenhum veículo cadastrado.</p>';
    } catch (error) { list.innerHTML = `<p class="text-warning">Não foi possível carregar o inventário. ${this.escape(error.message)}</p>`; }
  }
  async save() {
    const data = Object.fromEntries(new FormData(this.form).entries());
    for (const key of ['year','dailyRate','mileage','seats']) data[key] = data[key] === '' ? null : Number(data[key]);
    data.available = data.available === 'true';
    data.brand = data.brand.trim(); data.model = data.model.trim(); data.plate = data.plate.trim().toUpperCase();
    if (this.imageData) data.image = this.imageData;
    delete data.imageData;
    try {
      const id = data.id; delete data.id;
      if (id) await this.model.update(id, data); else await this.model.create(data);
      this.notify(id ? 'Veículo atualizado.' : 'Veículo cadastrado com sucesso.'); this.reset(); await this.renderInventory(); this.onChange();
    } catch (error) { this.notify(error.message); }
  }
  async edit(id) {
    try {
      const car = (await this.model.getAll()).find(item => String(item.id) === String(id)); if (!car) return;
      Object.entries(car).forEach(([key,value]) => { const field = this.form.elements.namedItem(key); if (field && key !== 'image') field.value = key === 'available' ? String(value !== false) : value ?? ''; });
      this.imageData = car.imageData || (String(car.image || '').startsWith('data:') ? car.image : '');
      this.showPreview(car.imageData || car.image || '');
      $('#carFormTitle').textContent = 'Editar veículo'; $('#saveCarBtn').innerHTML = '<i class="bi bi-check-lg me-2"></i>Salvar alterações'; $('#cancelCarEdit').classList.remove('d-none'); this.form.scrollIntoView({behavior:'smooth',block:'start'});
    } catch (error) { this.notify(error.message); }
  }
  async remove(id) {
    if (!confirm('Deseja realmente excluir este veículo?')) return;
    try { await this.model.delete(id); this.notify('Veículo excluído.'); await this.renderInventory(); this.onChange(); } catch (error) { this.notify(error.message); }
  }
  readImage(file) {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { this.notify('Selecione uma imagem JPG, PNG ou WEBP.'); return; }
    if (file.size > 1.5 * 1024 * 1024) { this.notify('A imagem deve ter no máximo 1,5 MB.'); return; }
    const reader = new FileReader(); reader.onload = () => { this.imageData = reader.result; this.showPreview(this.imageData); }; reader.onerror = () => this.notify('Não foi possível ler a imagem.'); reader.readAsDataURL(file);
  }
  showPreview(src) { const img = $('#carImagePreview'), empty = $('#carImageEmpty'); if (src) { img.src = src; img.classList.remove('d-none'); empty.classList.add('d-none'); } else { img.classList.add('d-none'); empty.classList.remove('d-none'); } }
  reset() { this.form.reset(); this.form.elements.id.value = ''; this.imageData = ''; $('#carImageFile').value = ''; this.showPreview(''); $('#carFormTitle').textContent = 'Adicionar veículo'; $('#saveCarBtn').innerHTML = '<i class="bi bi-plus-lg me-2"></i>Salvar veículo'; $('#cancelCarEdit').classList.add('d-none'); }
  async loadFipeBrands() {
    try { const response = await fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas'); if (!response.ok) return; const brands = await response.json(); $('#fipeBrands').innerHTML = brands.map(b=>`<option value="${this.escape(b.nome)}"></option>`).join(''); }
    catch { $('#externalApiStatus').textContent = 'FIPE indisponível no momento; você pode preencher marca e modelo manualmente.'; }
  }
  async loadFipeModels() {
    const brand = $('input[name="brand"]').value.trim(); const datalist = $('#fipeModels'); datalist.innerHTML = '';
    try { const brands = await (await fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas')).json(); const match = brands.find(b=>b.nome.toLowerCase()===brand.toLowerCase()); if (!match) return; const data = await (await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${match.codigo}/modelos`)).json(); datalist.innerHTML = data.modelos.map(m=>`<option value="${this.escape(m.nome)}"></option>`).join(''); }
    catch { /* consulta externa opcional; cadastro manual permanece disponível */ }
  }
  async lookupCep() {
    const cep = $('#carZipCode').value.replace(/\D/g,''); if (cep.length !== 8) return;
    try { const data = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json(); if (data.erro) throw new Error('CEP não encontrado.'); $('#carLocation').value = [data.logradouro,data.bairro,data.localidade,data.uf].filter(Boolean).join(', '); $('#externalApiStatus').textContent = 'Endereço preenchido pelo ViaCEP.'; }
    catch (error) { $('#externalApiStatus').textContent = error.message || 'ViaCEP indisponível; preencha o endereço manualmente.'; }
  }
  escape(value) { return String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
}
