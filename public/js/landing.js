// Landing: revelação ao rolar, contagem dos números e item ativo do menu.
// Sem JS (ou com movimento reduzido) a página fica completa e estática.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COUNT_DURATION = 1800;
const STAGGER_MS = 90;

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - 2 ** (-10 * t);
}

function animateCount(el) {
  const target = Number(el.dataset.count);
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / COUNT_DURATION, 1);
    el.textContent = Math.round(target * easeOutExpo(t)).toLocaleString('pt-BR');
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Marca no menu a seção que ocupa o meio da tela (aria-current="true").
function initScrollSpy() {
  const links = [...document.querySelectorAll('.topnav__menu a[href^="#"]')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const setActive = (id) => {
    links.forEach((a) => {
      if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ isIntersecting, target }) => {
        if (isIntersecting) setActive(target.id);
        else if (links.some((a) => a.getAttribute('aria-current') && a.getAttribute('href') === `#${target.id}`)) setActive(null);
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((section) => observer.observe(section));
}

function initReveal() {
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    group.querySelectorAll('[data-reveal]').forEach((el, i) => {
      el.style.transitionDelay = `${i * STAGGER_MS}ms`;
    });
  });

  const counters = document.querySelectorAll('[data-count]');
  counters.forEach((el) => {
    el.textContent = '0';
  });
  document.documentElement.classList.add('reveal-on');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        observer.unobserve(target);
        if (target.dataset.count === undefined) {
          target.classList.add('is-visible');
          // Sem isso o atraso escalonado também atrasaria o hover depois.
          target.addEventListener('transitionend', () => target.style.removeProperty('transition-delay'), { once: true });
          return;
        }
        // O número começa a contar junto com a entrada do card que o contém.
        const delay = parseInt(target.closest('[data-reveal]')?.style.transitionDelay, 10) || 0;
        setTimeout(() => animateCount(target), delay);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  );

  document.querySelectorAll('[data-reveal], [data-count]').forEach((el) => observer.observe(el));
}

initScrollSpy();
initReveal();
