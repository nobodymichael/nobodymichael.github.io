(() => {
  const clock=document.getElementById('local-clock');
  const options={timeZone:'Europe/Warsaw'};
  const hour=new Intl.DateTimeFormat('pl-PL',{...options,hour:'2-digit',minute:'2-digit'});
  const date=new Intl.DateTimeFormat('pl-PL',{...options,weekday:'long',day:'numeric',month:'long'});
  function tick(){
    const now=new Date();clock.textContent=hour.format(now);clock.dateTime=now.toISOString();
    document.getElementById('local-date').textContent=date.format(now);
  }
  function sky(code){
    if(code===0)return 'Bezchmurnie';
    if(code===1)return 'Prawie bezchmurnie';
    if(code===2)return 'Częściowe zachmurzenie';
    if(code===3)return 'Pochmurno';
    if([45,48].includes(code))return 'Mgła';
    if(code>=51&&code<=57)return 'Mżawka';
    if(code>=61&&code<=67)return 'Deszcz';
    if(code>=71&&code<=77||[85,86].includes(code))return 'Śnieg';
    if(code>=80&&code<=82)return 'Przelotny deszcz';
    if(code>=95&&code<=99)return 'Burze';
    return 'Pogoda w Zabrzu';
  }
  let lastAttempt=0;
  async function weather(){
    if(Date.now()-lastAttempt<900000)return;
    lastAttempt=Date.now();
    try{
      const url='https://api.open-meteo.com/v1/forecast?latitude=50.3249&longitude=18.7857&current=temperature_2m,weather_code&timezone=Europe%2FWarsaw';
      const response=await fetch(url,{signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error();
      const {current}=await response.json();
      if(!Number.isFinite(current?.temperature_2m))throw Error();
      document.getElementById('local-temp').textContent=Math.round(current.temperature_2m)+' °C';
      document.getElementById('local-sky').textContent=sky(current.weather_code);
    }catch{
      document.getElementById('local-temp').textContent='–– °C';
      document.getElementById('local-sky').textContent='Pogoda niedostępna';
    }
  }
  function update(){if(!document.hidden){tick();weather()}}
  update();setInterval(update,1000);document.addEventListener('visibilitychange',update);
})();
