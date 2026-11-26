(() => {
  const names = {start:'Start',pulse:'PULSE',qrgen:'QRGEN',exif:'EXIF'};
  const home = document.getElementById('home-view');
  const frames = document.getElementById('frames');
  const tabs = document.querySelectorAll('.rail [data-tab]');
  function switchView() {
    const key = location.hash.slice(1);
    const tab = Object.hasOwn(names,key) ? key : 'start';
    const start = tab === 'start';
    home.hidden = !start;
    frames.hidden = start;
    document.querySelector('.desk').classList.toggle('in-tool', !start);
    document.getElementById('active-name').textContent = names[tab];
    document.title = start ? 'NOBODY — Narzędzia' : names[tab]+' — NOBODY';
    for (const link of tabs) {
      if (link.dataset.tab === tab) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    }
    for (const frame of frames.children) frame.hidden = frame.dataset.tab !== tab;
    if (!start && !frames.querySelector('[data-tab="'+tab+'"]')) {
      const frame = document.createElement('iframe');
      frame.src = tab+'/';
      frame.title = names[tab];
      frame.dataset.tab = tab;
      frames.append(frame);
    }
  }
  window.addEventListener('hashchange',switchView);
  switchView();
})();
