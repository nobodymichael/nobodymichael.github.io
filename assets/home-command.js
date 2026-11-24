(function () {
  'use strict';
  const trigger = document.getElementById('nm-command-trigger');
  const dialog = document.getElementById('nm-command');
  const form = document.getElementById('nm-command-form');
  const input = document.getElementById('nm-command-input');
  const status = document.getElementById('nm-command-status');
  if (!trigger || !dialog || !form || !input || !status) return;

  // These are shortcuts to public pages, not passwords or access controls.
  // Fixed destinations only; never navigate to arbitrary user-supplied URLs.
  const routes = new Map([
    ['games', '/games/'],
    ['wallet', '/wallet/']
  ]);

  function setStatus(message, error) {
    status.textContent = message;
    status.dataset.error = String(Boolean(error));
  }
  function open() {
    if (dialog.open) return;
    input.value = '';
    setStatus('awaiting input_', false);
    dialog.showModal();
    input.focus();
  }
  trigger.addEventListener('click', open);
  dialog.querySelector('.nm-command-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => trigger.focus());
  input.addEventListener('input', () => setStatus('awaiting input_', false));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const command = input.value.trim().toLowerCase();
    const path = routes.get(command);
    if (!path) {
      setStatus('ERR // unknown command', true);
      input.select();
      return;
    }
    setStatus('OK // opening module', false);
    window.location.assign(path);
  });
})();
