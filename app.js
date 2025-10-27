// === Utilidades ===
const $  = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const BRL = n => (n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const todayISO = () => new Date().toISOString().slice(0,10);

// Polyfill para randomUUID (se necessário)
if (!(globalThis.crypto && typeof crypto.randomUUID === 'function')) {
  globalThis.crypto = globalThis.crypto || {};
  crypto.randomUUID = () => 'id-' + Math.random().toString(36).slice(2) + Date.now();
}

// === Estado ===
const STORE_KEY = 'mm-finance-data-v1';
const A11Y_KEY  = 'mm-a11y';
let data = load() || sampleData();
let pieChart; // único gráfico (pizza de despesas)

// === Inicialização ===
window.addEventListener('DOMContentLoaded', () => {
  applySavedA11y();
  setupMonthYear();
  bindUI();
  renderAll();
});

function bindUI(){
  $('#btnAdd')?.addEventListener('click', () => openModal());
  $('#btnExport')?.addEventListener('click', exportXLSX);
  $('#fileInput')?.addEventListener('change', importXLSX);

  // Limpar tudo (agora no grupo IO)
  $('#btnReset')?.addEventListener('click', () => {
    if(confirm('Tem certeza que deseja limpar todos os dados?')){
      data = []; save(); renderAll();
    }
  });

  // Acessibilidade (botão discreto no header)
  $('#btnA11y')?.addEventListener('click', toggleA11y);

  // Filtros
  $('#monthSelect')?.addEventListener('change', renderAll);
  $('#yearSelect')?.addEventListener('change', renderAll);

  // Modal (criar/editar)
  const form = $('#txForm');
  form?.addEventListener('submit', ev => {
    ev.preventDefault();
    const tx = collectForm();
    if(!tx.id){ tx.id = crypto.randomUUID(); data.push(tx); }
    else{
      const i = data.findIndex(t => t.id === tx.id);
      if(i>-1) data[i] = tx;
    }
    save(); $('#txModal')?.close(); renderAll();
  });

  $('#btnDelete')?.addEventListener('click', () => {
    const id = $('#txId').value;
    if(id && confirm('Excluir esta transação?')){
      data = data.filter(t => t.id !== id);
      save(); $('#txModal')?.close(); renderAll();
    }
  });
}

function setupMonthYear(){
  const mSel = $('#monthSelect'), ySel = $('#yearSelect');
  if(!mSel || !ySel) return;
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  mSel.innerHTML = months.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  const now = new Date();
  let ys = ''; for(let y=now.getFullYear()-3;y<=now.getFullYear()+3;y++) ys += `<option value="${y}">${y}</option>`;
  ySel.innerHTML = ys;
  mSel.value = now.getMonth()+1; ySel.value = now.getFullYear();
}

function renderAll(){
  renderTable();
  renderSummaryAndHeaderImage();
  renderPieExpenses();
}

function currentRange(){
  const m = +($('#monthSelect')?.value || (new Date().getMonth()+1));
  const y = +($('#yearSelect')?.value || (new Date().getFullYear()));
  const start = new Date(y, m-1, 1);
  const end = new Date(y, m, 0);
  return {m,y,start,end};
}

function inRange(d, start, end){
  const dt = (d instanceof Date) ? d : new Date(d);
  return dt >= start && dt <= end;
}

function filtered(){
  const {start,end} = currentRange();
  return data.filter(tx => inRange(tx.date, start, end));
}

function renderTable(){
  const tbody = $('#txTable tbody'); if(!tbody) return;
  tbody.innerHTML = '';
  for (const tx of filtered().sort((a,b)=>new Date(a.date)-new Date(b.date))){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(tx.date)}</td>
      <td>${escapeHtml(tx.category)}</td>
      <td>${escapeHtml(tx.desc||'')}</td>
      <td>${tx.type}</td>
      <td class="num">${BRL(tx.value)}</td>
      <td>${escapeHtml(tx.method||'')}</td>
      <td class="row-actions"><button class="btn ghost" title="Editar" aria-label="Editar lançamento">✏️</button></td>`;
    tr.querySelector('button').addEventListener('click', () => openModal(tx));
    tbody.appendChild(tr);
  }
}

function renderSummaryAndHeaderImage(){
  const rows = filtered();
  const inSum = rows.filter(r=>r.type==='Entrada').reduce((s,r)=>s+Number(r.value||0),0);
  const outSum = rows.filter(r=>r.type==='Saída').reduce((s,r)=>s+Number(r.value||0),0);

  $('#sumIn')  && ($('#sumIn').textContent  = BRL(inSum));
  $('#sumOut') && ($('#sumOut').textContent = BRL(outSum));
  const bal = inSum - outSum;
  const elBal = $('#sumBalance');
  if(elBal){
    elBal.textContent = BRL(bal);
    elBal.classList.toggle('ok', bal>=0);
    elBal.classList.toggle('danger', bal<0);
  }

  // Feedback via imagem no header
  updateHeaderImage(inSum, outSum);
}

// Feedback por IMAGEM (assets/*.png)
function updateHeaderImage(inSum, outSum){
  const img = $('#statusImg'); if(!img) return;
  const ratio = inSum > 0 ? outSum / inSum : (outSum > 0 ? 1 : 0);
  let file = 'status_neutral.png';
  if (inSum === 0 && outSum === 0){
    file = 'status_neutral.png';
  } else if (inSum - outSum < 0){
    file = 'status_danger.png';
  } else if (ratio <= 0.6){
    file = 'status_ok.png';
  } else if (ratio <= 0.9){
    file = 'status_warn.png';
  } else {
    file = 'status_danger.png';
  }
  img.src = `assets/${file}`;
  img.alt = `Status: ${file.replace('status_','').replace('.png','')}`;
}

// === GRÁFICO ÚNICO: PIZZA DE DESPESAS (%) ===
function renderPieExpenses(){
  const ctx = $('#pieChart');
  if(!ctx || typeof Chart === 'undefined') return;

  const rows = filtered();
  const expRows = rows.filter(r=>r.type==='Saída');

  const byCat = groupBy(expRows, r=>r.category || 'Outros');
  const labels = Object.keys(byCat);
  const values = labels.map(k => byCat[k].reduce((s,r)=>s+Number(r.value||0),0));

  const total = values.reduce((a,b)=>a+b,0) || 1;
  const percents = values.map(v => +(v*100/total).toFixed(2));

  if (pieChart) pieChart.destroy();

  const a11y = isA11yOn();
  const borderWidth = a11y ? 2 : 1;
  const borderColor = a11y ? '#000' : undefined;
  const hoverOffset = a11y ? 8 : 6;

  pieChart = new Chart(ctx, {
    type:'pie',
    data:{
      labels,
      datasets:[{
        data: percents,
        backgroundColor: scaleReds(labels.length), // variações de vermelho
        borderWidth,
        borderColor
      }]
    },
    options:{
      responsive: true,
      hoverOffset,
      plugins:{
        legend:{
          position:'bottom',
          labels:{ usePointStyle:true, pointStyle:'circle' }
        },
        tooltip:{
          callbacks:{
            label: (ctx) => {
              const i = ctx.dataIndex;
              const val = percents[i] || 0;
              return `${labels[i]}: ${val}% (${BRL(values[i]||0)})`;
            }
          }
        }
      },
      animation: a11y ? false : { duration: 400 }
    }
  });
}

// Paleta de vermelhos consistente
function scaleReds(n){
  const base = ['#7f1d1d','#991b1b','#b91c1c','#dc2626','#ef4444','#f87171','#fecaca'];
  if (n <= base.length) return base.slice(0, n);
  return repeatToLength(base, n);
}
function repeatToLength(arr, n){
  const out = []; let i=0;
  while(out.length < n){ out.push(arr[i % arr.length]); i++; }
  return out;
}

function openModal(tx){
  $('#txForm')?.reset();
  $('#txId').value = tx?.id || '';
  $('#txDate').value = tx?.date ? toISO(tx.date) : todayISO();
  $('#txCategory').value = tx?.category || '';
  $('#txDesc').value = tx?.desc || '';
  $('#txType').value = tx?.type || 'Saída';
  $('#txValue').value = tx?.value ?? '';
  $('#txMethod').value = tx?.method || '';
  $('#btnDelete').hidden = !tx;
  $('#modalTitle').textContent = tx ? 'Editar transação' : 'Nova transação';
  $('#txModal')?.showModal();
}

function collectForm(){
  return {
    id: $('#txId').value || undefined,
    date: $('#txDate').value,
    category: ($('#txCategory').value || '').trim() || 'Outros',
    desc: ($('#txDesc').value || '').trim(),
    type: $('#txType').value,
    value: Number($('#txValue').value || 0),
    method: ($('#txMethod').value || '').trim()
  };
}

// === Acessibilidade (persistente) ===
function applySavedA11y(){
  const saved = localStorage.getItem(A11Y_KEY);
  const on = saved === 'on';
  document.documentElement.setAttribute('data-a11y', on ? 'on' : 'off');
  const btn = $('#btnA11y');
  if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
}
function toggleA11y(){
  const isOn = isA11yOn();
  const next = isOn ? 'off' : 'on';
  document.documentElement.setAttribute('data-a11y', next);
  localStorage.setItem(A11Y_KEY, next);
  const btn = $('#btnA11y');
  if (btn) btn.setAttribute('aria-pressed', next === 'on' ? 'true' : 'false');
  // re-render para aplicar opções de acessibilidade no gráfico
  renderPieExpenses();
}
function isA11yOn(){
  return (document.documentElement.getAttribute('data-a11y') === 'on');
}

// === Persistência ===
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function load(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY)||'[]'); }catch{ return []; } }

// === Helpers ===
function groupBy(arr, keyFn){
  return arr.reduce((acc, item) => {
    const k = keyFn(item) || 'Outros';
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}
function fmtDate(d){ const dt = new Date(d); return dt.toLocaleDateString('pt-BR'); }
function toISO(d){ return new Date(d).toISOString().slice(0,10); }
function escapeHtml(s=''){ return s.replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

function sampleData(){
  const base = [
    {date:'2025-10-01', category:'Alimentação', desc:'Supermercado', type:'Saída', value:150, method:'Cartão'},
    {date:'2025-10-03', category:'Salário', desc:'Pagamento mensal', type:'Entrada', value:3500, method:'Transferência'},
    {date:'2025-10-05', category:'Transporte', desc:'Combustível', type:'Saída', value:200, method:'Cartão'},
    {date:'2025-10-07', category:'Lazer', desc:'Cinema', type:'Saída', value:60, method:'Dinheiro'}
  ];
  return base.map(x => ({id:crypto.randomUUID(), ...x}));
}

// === Import/Export XLSX ===
function exportXLSX(){
  const wsData = [
    ['Data','Categoria','Descrição','Tipo (Entrada/Saída)','Valor (R$)','Forma de Pagamento'],
    ...data.map(t => [fmtDate(t.date), t.category, t.desc||'', t.type, Number(t.value||0), t.method||''])
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Controle');
  XLSX.writeFile(wb, 'Controle_Financeiro_Mickey_Minnie.xlsx');
}

function importXLSX(ev){
  const file = ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
      const [header, ...rest] = rows;
      const idx = mapIndexes(header);
      const imported = rest
        .filter(r => r && r.length && (safeAt(r, idx.data) || safeAt(r, idx.valor)))
        .map(r => ({
          id: crypto.randomUUID(),
          date: toISO(parseDateBR(safeAt(r, idx.data))),
          category: (safeAt(r, idx.categoria)||'').toString(),
          desc: (safeAt(r, idx.desc)||'').toString(),
          type: (safeAt(r, idx.tipo)||'Saída').toString(),
          value: Number((safeAt(r, idx.valor)||'0').toString().replace(/\./g,'').replace(',','.')),
          method: (safeAt(r, idx.forma)||'').toString()
        }))
        .filter(t => !Number.isNaN(t.value));
      if(!imported.length){
        alert('Nenhum dado válido encontrado. Verifique cabeçalhos e formatos.');
        return;
      }
      data = imported; save(); renderAll(); ev.target.value = '';
    }catch(err){
      console.error(err); alert('Erro ao importar. Verifique o arquivo XLSX.');
    }
  };
  reader.readAsArrayBuffer(file);
}

function mapIndexes(hdr){
  const norm = s => (s||'').toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
  const find = key => hdr.findIndex(x => norm(x).includes(key));
  const tipoIdx = (() => {
    const t = find('tipo'); if (t > -1) return t;
    const e = find('entrada'); if (e > -1) return e;
    const s1 = find('saida'); if (s1 > -1) return s1;
    return -1;
  })();
  return { data: find('data'), categoria: find('categoria'), desc: find('descri'),
           tipo: tipoIdx, valor: find('valor'), forma: find('forma') };
}

function parseDateBR(s){
  if (!s) return new Date();
  if (s instanceof Date) return s;
  const str = s.toString().trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(m){ const [_,d,mo,y]=m; return new Date(Number(y.length===2 ? '20'+y : y), Number(mo)-1, Number(d)); }
  if(/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str);
  const dt = new Date(str); return isNaN(dt) ? new Date() : dt;
}
function safeAt(arr, i){ return (typeof i === 'number' && i > -1) ? arr[i] : undefined; }
