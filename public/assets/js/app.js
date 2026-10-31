import { AppView } from './views/AppView.js';
import { AuthController } from './controllers/AuthController.js';
import { CarController } from './controllers/CarController.js';
import { RentalController } from './controllers/RentalController.js';
import { CarAdminController } from './controllers/CarAdminController.js';
import { UserModel } from './models/UserModel.js';
import { CarModel } from './models/CarModel.js';

// Ponto de entrada da aplicação: conecta View, Controllers e Models.
const $ = selector => {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Elemento obrigatório não encontrado: ${selector}`);
  return element;
};

const view = new AppView();
const toastElement = $('#appToast');
const toast = bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 3500 });
const notify = message => {
  $('#toastMessage').textContent = message;
  toast.show();
};

let currentUser = null;
const agentDashboard = $('#agentDashboard');
const mainSections = [
  ...document.querySelectorAll(
    '#inicio > .hero, #inicio > .search-strip, #inicio > #frota, #inicio > #experiencia, #inicio > .footer'
  )
];

function closeAgentDashboard() {
  agentDashboard.classList.add('d-none');
  mainSections.forEach(section => section.classList.remove('d-none'));
}

function updateUser(user) {
  currentUser = user;
  $('#authNav').classList.toggle('d-none', Boolean(user));
  $('#userNav').classList.toggle('d-none', !user);
  $('#userName').textContent = user ? `Olá, ${(user.name || 'usuário').split(' ')[0]}` : '';
  $('#agentNav').classList.toggle('d-none', !user || user.role !== 'agent');

  if (!user || user.role !== 'agent') closeAgentDashboard();
}

const auth = new AuthController(updateUser, notify);
const userModel = new UserModel();
const rentals = new RentalController(null, view, () => currentUser, notify);
const cars = new CarController(view, car => {
  if (!currentUser) {
    notify('Entre ou crie uma conta antes de reservar.');
    bootstrap.Modal.getOrCreateInstance($('#authModal')).show();
    return;
  }
  if (currentUser.role === 'agent') {
    notify('Contas de agente analisam pedidos; use uma conta de cliente para reservar.');
    return;
  }
  view.showRentalForm(car);
  bootstrap.Modal.getOrCreateInstance($('#rentalModal')).show();
}, notify);
const adminCars = new CarAdminController(notify, () => cars.init());

function openAgentDashboard() {
  if (!currentUser || currentUser.role !== 'agent') return;
  mainSections.forEach(section => section.classList.add('d-none'));
  agentDashboard.classList.remove('d-none');
  adminCars.load();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Autenticação e navegação.
auth.restore();
cars.init();
$('#manageCarsNav').addEventListener('click', openAgentDashboard);
$('#exitFleetManagement').addEventListener('click', () => {
  closeAgentDashboard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
$('#loginTab').addEventListener('click', () => auth.setMode('login'));
$('#registerTab').addEventListener('click', () => auth.setMode('register'));
$('#authForm').addEventListener('submit', async event => {
  event.preventDefault();
  await auth.submit(event.currentTarget);
});
$('#logoutBtn').addEventListener('click', () => {
  closeAgentDashboard();
  auth.logout();
});
$('#myRentalsBtn').addEventListener('click', () => {
  closeAgentDashboard();
  rentals.openPanel();
});

$('#heroReserveBtn').addEventListener('click', () => {
  if (!currentUser) {
    notify('Entre ou crie uma conta antes de reservar.');
    bootstrap.Modal.getOrCreateInstance($('#authModal')).show();
    return;
  }
  if (currentUser.role === 'agent') {
    notify('Contas de agente analisam pedidos; use uma conta de cliente para reservar.');
    return;
  }
  const car = cars.filtered[cars.index];
  if (!car) {
    notify('Nenhum veículo disponível para reserva no momento.');
    return;
  }
  view.showRentalForm(car);
  bootstrap.Modal.getOrCreateInstance($('#rentalModal')).show();
});

$('#prevCar').addEventListener('click', () => cars.show(cars.index - 1));
$('#nextCar').addEventListener('click', () => cars.show(cars.index + 1));
$('#carGrid').addEventListener('click', event => {
  const button = event.target.closest('[data-rent]');
  if (button) cars.rent(button.dataset.rent);
});

// Solicitações de aluguel.
$('#rentalForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (await rentals.create(event.currentTarget)) await rentals.openPanel();
});
$('#rentalsContent').addEventListener('click', event => {
  const decision = event.target.closest('[data-decision]');
  const cancel = event.target.closest('[data-cancel]');
  const edit = event.target.closest('[data-edit]');
  if (decision) rentals.decide(decision.dataset.id, decision.dataset.decision);
  if (cancel) rentals.cancel(cancel.dataset.cancel);
  if (edit) rentals.edit(edit.dataset.edit);
});

// Busca rápida: valida o período e aplica o filtro de categoria.
$('#quickSearch').addEventListener('submit', event => {
  event.preventDefault();
  const start = event.currentTarget.elements.pickupDate.value;
  const end = event.currentTarget.elements.returnDate.value;
  if (!start || !end || end <= start) {
    notify('A devolução deve ocorrer depois da retirada.');
    return;
  }
  cars.filter($('#categoryFilter').value);
  $('#frota').scrollIntoView({ behavior: 'smooth' });
});

// Datas locais: evita diferenças de fuso ao converter a data para YYYY-MM-DD.
function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const startInput = $('#pickupDate');
const endInput = $('#returnDate');
const today = localDateString();
const tomorrow = localDateString(new Date(Date.now() + 86400000));
startInput.min = today;
endInput.min = tomorrow;
startInput.value = today;
endInput.value = tomorrow;

const rentalForm = $('#rentalForm');
const updatePrice = () => {
  const carId = rentalForm.elements.carId.value;
  const car = cars.cars.find(item => String(item.id) === String(carId));
  if (car) {
    view.updateEstimate(
      car.dailyRate,
      rentalForm.elements.startDate.value,
      rentalForm.elements.endDate.value
    );
  }
};
rentalForm.elements.startDate.addEventListener('change', event => {
  rentalForm.elements.endDate.min = event.target.value;
  if (rentalForm.elements.endDate.value <= event.target.value) {
    rentalForm.elements.endDate.value = localDateString(new Date(new Date(`${event.target.value}T12:00:00`).getTime() + 86400000));
  }
  updatePrice();
});
rentalForm.elements.endDate.addEventListener('change', updatePrice);

// Efeito de partículas local, sem bloquear cliques e respeitando redução de movimento.
function initMouseTrail() {
  const desktopPointer = window.matchMedia('(pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!desktopPointer || reducedMotion) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'mouse-trail-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    return;
  }

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  const particles = [];
  const colors = ['#b7f36b', '#d7ffad', '#ffffff'];

  const resize = () => {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let lastX = null;
  let lastY = null;
  window.addEventListener('mousemove', event => {
    const x = event.clientX;
    const y = event.clientY;
    if (lastX !== null) {
      const distance = Math.hypot(x - lastX, y - lastY);
      const count = Math.min(4, Math.floor(distance / 9));
      for (let index = 0; index < count; index++) {
        const ratio = (index + 1) / (count + 1);
        particles.push({
          x: lastX + (x - lastX) * ratio,
          y: lastY + (y - lastY) * ratio,
          vx: (Math.random() - 0.5) * 0.55,
          vy: (Math.random() - 0.5) * 0.55 + 0.25,
          life: 1,
          size: 1.5 + Math.random() * 2.2,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
      if (particles.length > 90) particles.splice(0, particles.length - 90);
    }
    lastX = x;
    lastY = y;
  }, { passive: true });
  window.addEventListener('blur', () => {
    lastX = null;
    lastY = null;
  }, { passive: true });

  const animate = () => {
    context.clearRect(0, 0, width, height);
    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 0.025;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      context.globalAlpha = particle.life * 0.72;
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}
initMouseTrail();

// Consulta, atualização e exclusão do cadastro do usuário.
$('#profileBtn').addEventListener('click', () => {
  if (!currentUser) return;
  const form = $('#profileForm');
  ['name', 'email', 'cpf', 'rg', 'address', 'profession'].forEach(key => {
    form.elements[key].value = currentUser[key] || '';
  });
  bootstrap.Modal.getOrCreateInstance($('#profileModal')).show();
});

$('#profileForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentUser) return;
  try {
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const updated = await userModel.update(currentUser.id, data);
    // Nunca persistir a senha devolvida pelo JSON Server no armazenamento local.
    const safeUpdated = { ...updated };
    delete safeUpdated.password;
    currentUser = { ...currentUser, ...safeUpdated };
    delete currentUser.password;
    localStorage.setItem('verticeUser', JSON.stringify(currentUser));
    updateUser(currentUser);
    bootstrap.Modal.getOrCreateInstance($('#profileModal')).hide();
    notify('Cadastro atualizado.');
  } catch (error) {
    notify(error.message || 'Não foi possível atualizar o cadastro.');
  }
});

$('#deleteAccountBtn').addEventListener('click', async () => {
  if (!currentUser || !confirm('Excluir seu cadastro? Esta ação não pode ser desfeita.')) return;
  try {
    await userModel.delete(currentUser.id);
    bootstrap.Modal.getOrCreateInstance($('#profileModal')).hide();
    auth.logout();
    notify('Cadastro excluído.');
  } catch (error) {
    notify(error.message || 'Não foi possível excluir o cadastro.');
  }
});
