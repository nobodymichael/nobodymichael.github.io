(() => {
  const labels = {rynek:'Rynek', analiza:'Analiza', cele:'Moje poziomy'};
  const aliases = {wskazniki:'rynek', waluty:'rynek', quotes:'rynek', scanner:'analiza', 'metal-range':'analiza', levels:'cele', 'gold-silver':'rynek'};
  const nav = document.querySelector('nav');
  function navigate() {
    const hash = location.hash.slice(1);
    const key = Object.hasOwn(labels, hash) ? hash : aliases[hash] || 'rynek';
    for (const section of document.querySelectorAll('[data-view]')) section.hidden = section.dataset.view !== key;
    for (const link of nav.querySelectorAll('a')) {
      if (link.hash === '#' + key) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    const heading = document.getElementById('view-title');
    heading.textContent = labels[key];
    document.title = 'PULSE · ' + labels[key];
    if (Object.hasOwn(aliases,hash)) document.getElementById(hash)?.scrollIntoView();
    else window.scrollTo(0,0);
    document.dispatchEvent(new CustomEvent('pulse-view', {detail:key}));
  }
  window.addEventListener('hashchange',navigate);
  navigate();
})();
