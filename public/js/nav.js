// Navbar compartilhada: menu recolhível no mobile.
// Sem JS o menu continua visível (o CSS só recolhe com [data-collapsible]).

const header = document.querySelector('.topnav');
const toggle = header?.querySelector('.topnav__toggle');
const menu = header?.querySelector('.topnav__menu');

if (header && toggle && menu) {
  header.setAttribute('data-collapsible', '');
  toggle.hidden = false;

  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };

  toggle.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });
}
