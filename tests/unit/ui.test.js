import { setText, h, fieldError, clearFieldErrors, applyErrors, setBusy, announce, statusPill, priorityPill, renderEmpty, historyText, renderFatal, confirmModal, charCounter, copySupportCode } from '../../public/js/ui.js';

describe('setText (nunca innerHTML)', () => {
  test('escapes markup as text', () => {
    document.body.innerHTML = '<p id="t"></p>';
    setText(document.getElementById('t'), '<img src=x onerror=alert(1)>');
    expect(document.getElementById('t').innerHTML).toContain('&lt;img');
  });
});

describe('h', () => {
  test('creates element with text and attributes', () => {
    const element = h('p', 'oi', { class: 'x' });
    expect(element.tagName).toBe('P');
    expect(element.textContent).toBe('oi');
    expect(element.getAttribute('class')).toBe('x');
  });

  test('setText handles nullish', () => {
    document.body.innerHTML = '<p id="t">x</p>';
    setText(document.getElementById('t'), null);
    expect(document.getElementById('t').textContent).toBe('');
  });
});

describe('applyErrors', () => {
  test('announces when no field matches', () => {
    document.body.innerHTML = '<form></form>';
    applyErrors(document.querySelector('form'), { unknown: 'Erro geral.' });
    expect(document.getElementById('announce').textContent).toBe('Erro geral.');
  });

  test('focuses first invalid field and skips unknown names', () => {
    document.body.innerHTML = '<form><input id="a" name="a"><input id="b" name="b"></form>';
    applyErrors(document.querySelector('form'), { b: 'Erro B.', a: 'Erro A.', ghost: 'x' });
    expect(document.activeElement.id).toBe('b');
    expect(document.getElementById('a-error').textContent).toBe('Erro A.');
  });
});
describe('field errors', () => {
  test('shows error next to the field and clears it', () => {
    document.body.innerHTML = '<form><input id="title"><button>ok</button></form>';
    const input = document.getElementById('title');

    fieldError(input, 'Título curto.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('title-error').textContent).toBe('Título curto.');

    clearFieldErrors(document.querySelector('form'));
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(document.getElementById('title-error')).toBeNull();
  });
});

describe('setBusy', () => {
  test('disables button while busy', () => {
    document.body.innerHTML = '<button id="b">Entrar</button>';
    const button = document.getElementById('b');
    setBusy(button, true);
    expect(button.disabled).toBe(true);
    setBusy(button, false);
    expect(button.disabled).toBe(false);
  });
});

describe('announce', () => {
  test('writes to aria-live region', () => {
    document.body.innerHTML = '';
    announce('Chamado criado.');
    const live = document.getElementById('announce');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe('Chamado criado.');
  });
});

describe('pills (texto + símbolo, nunca só cor)', () => {
  test.each([
    ['open', 'Aberto'],
    ['analysis', 'Em análise'],
    ['in_progress', 'Em atendimento'],
    ['resolved', 'Resolvido'],
    ['closed', 'Fechado'],
  ])('status %s renders label %s with svg icon', (status, label) => {
    const pill = statusPill(status);
    expect(pill.textContent).toContain(label);
    expect(pill.querySelector('svg')).not.toBeNull();
  });

  test.each([
    ['low', 'Baixa'],
    ['medium', 'Média'],
    ['high', 'Alta'],
    ['critical', 'Crítica'],
  ])('priority %s renders label %s with svg icon', (priority, label) => {
    const pill = priorityPill(priority);
    expect(pill.textContent).toContain(label);
    expect(pill.querySelector('svg')).not.toBeNull();
  });
});

describe('historyText (PT)', () => {
  test.each([
    [{ event: 'status.changed', before: 'open', after: 'analysis' }, 'Estado alterado (Aberto → Em análise)'],
    [{ event: 'priority.changed', before: 'low', after: 'high' }, 'Prioridade alterada (Baixa → Alta)'],
    [{ event: 'comment.added', before: null, after: 'oi' }, 'Comentário adicionado: oi'],
    [{ event: 'deleted', before: 'open', after: 'Duplicado.' }, 'Chamado excluído (Aberto → Duplicado.)'],
  ])('%p renders %s', (item, expected) => {
    expect(historyText(item)).toBe(expected);
  });
});

describe('renderFatal', () => {
  test('renders title, cause and actions with focus', () => {
    document.body.innerHTML = '<div id="e"></div>';
    let clicked = 0;
    renderFatal(document.getElementById('e'), {
      title: 'Chamado não encontrado.',
      cause: 'Pode ter sido excluído.',
      actions: [
        { label: 'Voltar à lista', href: '/screens/tickets.html' },
        { label: 'Tentar de novo', onClick: () => { clicked += 1; } },
      ],
    });

    expect(document.activeElement.textContent).toBe('Chamado não encontrado.');
    const links = document.querySelectorAll('#e a');
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/screens/tickets.html');
    expect(links[0].className).toContain('btn--primary');
    expect(links[1].className).toContain('btn--ghost');
    links[1].click();
    expect(clicked).toBe(1);
  });
});

describe('confirmModal', () => {
  test('confirms, cancels and closes on Escape', () => {
    document.body.innerHTML = '<button id="outside">x</button>';
    document.getElementById('outside').focus();
    let confirmed = 0;
    confirmModal({ title: 'Excluir?', body: 'Certeza?', confirmLabel: 'Excluir', onConfirm: () => { confirmed += 1; } });

    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    document.querySelector('.modal .btn--danger').click();
    expect(confirmed).toBe(1);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement.id).toBe('outside');

    confirmModal({ title: 'Excluir?', body: 'x', confirmLabel: 'Excluir', onConfirm: () => { confirmed += 1; } });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(confirmed).toBe(1);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  test('cancel button and backdrop close without confirming', () => {
    document.body.innerHTML = '';
    let confirmed = 0;
    confirmModal({ title: 'T?', body: 'B', confirmLabel: 'Ok', onConfirm: () => { confirmed += 1; } });
    document.querySelector('.modal .btn--ghost').click();
    expect(confirmed).toBe(0);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();

    confirmModal({ title: 'T?', body: 'B', confirmLabel: 'Ok', onConfirm: () => { confirmed += 1; } });
    const overlay = document.querySelector('.modal-overlay');
    overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(confirmed).toBe(0);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  test('tab cycles focus inside the dialog', () => {
    document.body.innerHTML = '';
    confirmModal({ title: 'T?', body: 'B', confirmLabel: 'Ok', onConfirm: () => {} });
    const cancel = document.querySelector('.modal .btn--ghost');
    const confirm = document.querySelector('.modal .btn--danger');
    confirm.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(cancel);
    cancel.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(confirm);
  });
});

describe('charCounter', () => {
  test('shows length over max', () => {
    document.body.innerHTML = '<input id="t" value="abc">';
    const input = document.getElementById('t');
    charCounter(input, 100);
    expect(document.querySelector('.char-counter').textContent).toBe('3/100');
    input.value = 'abcdef';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('.char-counter').textContent).toBe('6/100');
  });
});

describe('copySupportCode', () => {
  test('writes to clipboard and announces', async () => {
    document.body.innerHTML = '';
    const written = [];
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => written.push(t) }, configurable: true });

    await copySupportCode('req_123');

    expect(written).toEqual(['req_123']);
    expect(document.getElementById('announce').textContent).toBe('Código de suporte copiado.');
  });

  test('falls back without clipboard api', async () => {
    document.body.innerHTML = '';
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

    await copySupportCode('req_9');

    expect(document.getElementById('announce').textContent).toBe('Código de suporte copiado.');
  });
});
describe('renderEmpty', () => {
  test('explains absence and offers action (RF14)', () => {
    document.body.innerHTML = '<div id="e"></div>';
    renderEmpty(document.getElementById('e'), {
      title: 'Nenhum chamado por aqui.',
      actionText: 'Abrir chamado',
      actionHref: '/novo.html',
    });
    expect(document.getElementById('e').textContent).toContain('Nenhum chamado por aqui.');
    const link = document.querySelector('#e a');
    expect(link.textContent).toBe('Abrir chamado');
    expect(link.getAttribute('href')).toBe('/novo.html');
  });
});
