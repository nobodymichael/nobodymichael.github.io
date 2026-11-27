const PulseHistory=(()=>{
  const snapshots = new Map();

  async function getSnapshot(date) {
    if (snapshots.has(date)) return snapshots.get(date);
    const key = 'pulse-history-v1-' + date;
    if (date !== 'latest') {
      try {
        const cached = JSON.parse(localStorage.getItem(key));
        if (cached?.date === date && cached.usd?.xau > 0 && 'sol' in cached.usd && 'link' in cached.usd) return cached;
      } catch {}
    }
    const job = (async () => {
      for (const url of [
        'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@'+date+'/v1/currencies/usd.min.json',
        'https://'+date+'.currency-api.pages.dev/v1/currencies/usd.min.json'
      ]) {
        try {
          const res = await fetch(url,{signal:AbortSignal.timeout(7000)});
          if (!res.ok) continue;
          const data = await res.json();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !data.usd || (date !== 'latest' && data.date !== date)) continue;
          const compact = {date:data.date,usd:{}};
          for(const id of ['xau','xag','btc','eth','sol','link']) compact.usd[id]=Number(data.usd[id]);
          try {localStorage.setItem('pulse-history-v1-'+data.date,JSON.stringify(compact))} catch {}
          return compact;
        } catch {}
      }
      throw Error('Brak odczytu');
    })();
    snapshots.set(date,job);
    try {return await job} catch(e){snapshots.delete(date);throw e}
  }
  return {getSnapshot,refresh:()=>snapshots.delete('latest')};
})();
