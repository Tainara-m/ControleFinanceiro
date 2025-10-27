# Controle Financeiro

Registro simples e visual de finanças pessoais: **lançamentos de entradas/saídas**, **filtro por mês/ano**, **gráfico de pizza de despesas por categoria (%)**, **importação/exportação XLSX** e **modo de acessibilidade** (contraste, foco e tipografia otimizados).

> Feito por [Tainara Martins](https://github.com/tainara-m)

---

## ✨ Recursos

- **Lançamentos** com data, categoria, descrição, tipo (Entrada/Saída), valor e forma de pagamento  
- **Filtro por mês e ano** no topo  
- **Resumo automático**: Entradas, Saídas e Saldo  
- **Gráfico de Pizza (Chart.js)** com **percentual de despesas por categoria**  
- **Importar/Exportar XLSX** (SheetJS)  
- **Persistência local** com `localStorage`  
- **Acessibilidade (A11y)** ativável por botão no cabeçalho  
- **Feedback visual por imagem** no cabeçalho (`assets/status_ok.png`, `status_warn.png`, `status_danger.png`, `status_neutral.png`)  
- **Categorias via `<datalist>`** para agilizar o preenchimento

---

## 🖼️ Layout & Tema

- Cabeçalho com **logo** (`assets/Logo-png.png`) e **imagem de status do mês**  
- **Toolbar** com filtros e grupo de botões **Importar**, **Exportar** e **Limpar** (mesmo estilo e largura)  
- **Cards** para resumo, tabela de lançamentos e gráfico  
- **Rodapé** com ano automático

> **Dica:** as cores fazem referência ao tema Mickey (vermelho/amarelo/preto).

---

## ♿ Modo de Acessibilidade

Ative/desative pelo botão **Acessibilidade** no cabeçalho.  
Quando **ligado**:
- contraste e foco reforçados  
- tipografia e alvos interativos maiores  
- redução de animações  
- bordas e rótulos mais evidentes  
- ajustes no gráfico (borda, hover, sem animação)

O estado é salvo em `localStorage` (chave `mm-a11y`).

---

## 🧱 Stack

- **HTML/CSS/JS** puro (SPA estática)  
- **Chart.js** para o gráfico  
- **SheetJS (xlsx)** para importação/exportação  
- **Font Awesome 5** para ícones  
- **LocalStorage** para persistência

---

## 🚀 Como rodar

1. Baixe/clonar este repositório.
2. Abra o `index.html` no navegador.  
   - **Opcional (recomendado):** subir um servidor estático simples para evitar restrições de caminho.
   - Exemplos:
     - VS Code + Live Server
     - Python: `python -m http.server 8080` (acesse `http://localhost:8080`)

Não há backend — tudo roda no navegador.
