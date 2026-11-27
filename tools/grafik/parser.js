const time = /^(?:[01]?\d|2[0-3]):[0-5]\d$/;
export function describe(parts) {
  const hours = parts.filter(s => time.test(s));
  if (hours.length === 2) {
    const [a,b] = hours;
    const minutes = s => { const [h,m]=s.split(':').map(Number); return h*60+m };
    const note = parts.filter(s => !time.test(s)).join(' ');
    return {text:a+'–'+b+(minutes(b)<minutes(a)?' (+1)':'')+(note?' · '+note:''), off:false};
  }
  const code=parts.join('').replace(/\s/g,'');
  if (/^(DW5|NŚ|DWH|DWS|DWN)(?:\d{4}-?\d{2}-\d{2})?$/.test(code)) return {text:'Wolne',off:true,code:code.replace(/\d{4}-?\d{2}-?\d{2}$/,'')};
  return {text:parts.join(' ') || 'Brak wpisu',off:false};
}
export function readPage(items){
  const tokens=items.filter(t=>t.str?.trim()).map(t=>({s:t.str.trim(),x:t.transform[4],y:-t.transform[5],mid:t.transform[4]+t.width/2}));
  const period=tokens.map(t=>t.s).join(' ').match(/za okres:\s*(\d{1,2})\s*\/\s*(\d{4})/i);
  if(!period)throw Error('Nie rozpoznano miesiąca grafiku.');
  const month=Number(period[1]),year=Number(period[2]),days=new Date(year,month,0).getDate();
  const first=tokens.find(t=>t.s==='1' && tokens.some(u=>u.s==='2' && Math.abs(u.y-t.y)<1 && u.x>t.x));
  if(!first||month<1||month>12)throw Error('Nie rozpoznano nagłówka tabeli.');
  const cols=tokens.filter(t=>/^\d+$/.test(t.s)&&Math.abs(t.y-first.y)<1).sort((a,b)=>a.x-b.x);
  if(cols.length!==days || cols.some((c,i)=>Number(c.s)!==i+1))throw Error('Niepełne kolumny dni.');
  const step=cols[1].mid-cols[0].mid, left=cols[0].mid-step/2;
  const rows=tokens.filter(t=>t.x<left && t.y>first.y && /^\d+$/.test(t.s)).sort((a,b)=>a.y-b.y);
  if(!rows.length)throw Error('Nie rozpoznano wierszy pracowników.');
  const people=rows.map((row,i)=>{
    const bottom=rows[i+1]?.y ?? row.y+(i?row.y-rows[i-1].y:step*1.35);
    const cells=tokens.filter(t=>t!==row && t.y>=row.y-1 && t.y<bottom-1);
    const name=cells.filter(t=>t.x<left-1).sort((a,b)=>a.y-b.y||a.x-b.x).map(t=>t.s).join(' ');
    if(!name)throw Error('Nie rozpoznano nazwiska w wierszu '+row.s+'.');
    const entries=cols.map(()=>[]);
    for(const t of cells.filter(t=>t.x>=left-1)){
      const index=cols.reduce((best,c,j)=>Math.abs(c.mid-t.mid)<Math.abs(cols[best].mid-t.mid)?j:best,0);
      entries[index].push(t);
    }
    return {name, shifts:entries.map(cell=>describe(cell.sort((a,b)=>a.y-b.y||a.x-b.x).map(t=>t.s)))};
  });
  return {year,month,days,people};
}
