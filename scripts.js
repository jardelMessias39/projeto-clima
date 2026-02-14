let listaCompletaGlobal = [];
let climaDeHoje = null;
let somAmbiente = null;
let cidadeAtualNome = ""; // Variável global para não perder o nome da cidade

// 2. Tradução Senior para PT-BR
function formatarDiaPT(dataTexto) {
    if (!dataTexto) return "---";
    // Adicionamos o T12:00:00 para evitar que o fuso horário mude o dia
    const data = new Date(dataTexto + 'T12:00:00');
    return data.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
}

// 1. Função para abrir o projeto e destravar áudio
function abrirProjeto() {
    document.getElementById('launcher').style.display = 'none';
    const projeto = document.getElementById('conteudo-projeto');
    projeto.style.display = 'flex';
    setTimeout(() => { projeto.style.opacity = '1'; }, 10);
}
// 1. Atualizar fundo da caixa conforme clima
function atualizarFundoCaixa(climaPrincipal) {
    const caixaMedia = document.querySelector(".caixa-media");
    if (!caixaMedia) return;

    const temas = {
        'Clear': 'sunny,clear-sky,sunlight',
        'Clouds': 'cloudy,overcast,sky',
        'Rain': 'rainy,weather,water',
        'Thunderstorm': 'lightning,storm',
        'Snow': 'snow,winter',
        'Drizzle': 'mist,rain',
        'Mist': 'fog,mist',
        'Fog': 'fog,mist'
    };

    const busca = temas[climaPrincipal] || 'weather,sky';
    const urlFoto = `https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&w=1600&q=80`; 
    // Dica: Usei uma fixa de backup, mas se quiser a do Unsplash dinâmica:
    // const urlFoto = `https://source.unsplash.com/1600x900/?${busca}`;
    
    caixaMedia.style.backgroundImage = `url('${urlFoto}')`;
}

// 2. Tocar som ambiente baseado no código do clima
function tocarSomAmbienteComCodigo(weather) {
    if (!weather || !weather[0]) return;

    const id = weather[0].id;
    let urlSom = "";

    if (id >= 200 && id <= 232) urlSom = "./sons/som-do-trovao.mp3";
    else if (id >= 300 && id <= 531) urlSom = "./sons/som-da-chuva.mp3";
    else if (id >= 600 && id <= 622) urlSom = "./sons/som-de-neve.mp3";
    else if (id >= 800) urlSom = "./sons/som-do-vento.mp3";
    else return;

    if (somAmbiente) {
        somAmbiente.pause();
        somAmbiente.currentTime = 0;
    }

    somAmbiente = new Audio(urlSom);
    somAmbiente.loop = true;
    somAmbiente.volume = 0.15;
    somAmbiente.play().catch(e => console.log("Interação do usuário necessária para o som"));
}

// 3. Atualizar painel principal (Agora com verificações de segurança)
function atualizarPainelPrincipal(dados) {
    // 1. Mapeamento de elementos (Baseado no seu GitHub)
    const elementos = {
        cidade: document.querySelector(".nome-cidade"),
        temp: document.querySelector(".temp"),
        desc: document.querySelector(".descricao-clima"),
        icone: document.querySelector(".icone"),
        destaque: document.querySelector(".dia-destaque"),
        detalhes: document.querySelector(".detalhes")
    };

    // 2. Lógica do Nome da Cidade (Não deixa sumir ao clicar no card)
    if (dados.name) {
        cidadeAtualNome = dados.name; // Atualiza a global se for uma busca nova
    }
    if (elementos.cidade) {
        elementos.cidade.textContent = cidadeAtualNome;
    }

    // 3. Lógica do Nome do Dia (O que você pediu do GitHub)
    // Se vier do card, usa o dataLabel (Ex: TER). Se for busca nova, usa "HOJE".
    if (elementos.destaque) {
        elementos.destaque.textContent = dados.dataLabel || "HOJE";
    }
    
    // 4. Temperatura e Ícone
    const tempValue = Math.round(dados.main?.temp || dados.temp_max || 0);
    if (elementos.temp) elementos.temp.textContent = `${tempValue}°C`;
    
    const desc = (dados.weather?.[0].description || dados.climaPrincipal || '').toUpperCase();
    if (elementos.desc) elementos.desc.textContent = desc;

    const iconeCodigo = dados.weather?.[0].icon || dados.icon || '01d';
    if (elementos.icone) {
        elementos.icone.style.display = "block";
        elementos.icone.src = `https://openweathermap.org/img/wn/${iconeCodigo}@4x.png`;
    }

    // 5. Detalhes (Vento, Umidade, Sensação) - Corrigindo o NaN
    if (elementos.detalhes) {
        const umidade = dados.main?.humidity ?? dados.umidade ?? 0;
        const vento = Math.round(dados.wind?.speed ?? dados.vento ?? 0);
        const sensacao = Math.round(dados.main?.feels_like ?? dados.sensacao ?? tempValue);
        const pressao = dados.main?.pressure ?? dados.pressao ?? 1012;

        elementos.detalhes.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; font-size: 14px; margin-top: 10px;">
                <p>💧 Umidade: ${umidade}%</p>
                <p>💨 Vento: ${vento} m/s</p>
                <p>🌡️ Sensação: ${sensacao}°C</p>
                <p>⏲️ Pressão: ${pressao} hPa</p>
            </div>
        `;
    }

    // 6. Fundo e Som
    atualizarFundoCaixa(dados.weather?.[0].main || dados.climaPrincipal);
    tocarSomAmbienteComCodigo(dados.weather || [{id: 800}]);
}
// 4. Renderizar os cards debaixo
function renderizarCards() {
    const container = document.querySelector(".previsao-semanal");
    if (!container) return;
    container.innerHTML = "";

    if (!listaCompletaGlobal || listaCompletaGlobal.length === 0) return;

    // Filtro: Esconde o dia que está no topo
    const dataNoDestaque = climaDeHoje ? climaDeHoje.fullDate : null;
    const diasParaExibir = listaCompletaGlobal.filter(item => item.fullDate !== dataNoDestaque);

    diasParaExibir.slice(0, 5).forEach(dia => {
        const card = document.createElement("div");
        card.className = "card-previsao";
        
        const diaNome = formatarDiaPT(dia.fullDate);
        const probChuva = dia.chuva ?? dia.pop ?? 0;

        card.innerHTML = `
            <h4>${diaNome}</h4>
            <img src="https://openweathermap.org/img/wn/${dia.icon || '01d'}@2x.png">
            <p class="card-temp"><strong>${Math.round(dia.temp_max || 0)}°</strong></p>
            <p class="card-chuva">💧${Math.round(probChuva * 100)}%</p>
        `;
        
        card.onclick = () => {
            climaDeHoje = dia; // O card clicado vira o destaque
            atualizarPainelPrincipal(dia);
            renderizarCards(); // Re-renderiza para o dia antigo "descer" e o novo "sumir"
        };
        
        container.appendChild(card);
    });
}


// 5. Busca Previsão Semanal
async function buscarPrevisaoSemanal(lat, lon) {
    try {
        const res = await fetch(`https://meu-portfolio-backend-wgmj.onrender.com/api/previsao?lat=${lat}&lon=${lon}`);
        const dados = await res.json();
        
        // Substitui a lista antiga pela nova do backend
        listaCompletaGlobal = dados; 
        
        renderizarCards();
    } catch (e) {
        console.error("Erro na previsão:", e);
    }
}
// 6. Clique no Botão
async function cliqueinoBotao() {
    const cidade = document.querySelector(".input-cidade").value.trim();
    if (!cidade) return;

    const aviso = document.querySelector(".loading-aviso");
    if (aviso) aviso.style.display = "block"; // Mostra o aviso

    try {
        const res = await fetch(`https://meu-portfolio-backend-wgmj.onrender.com/api/clima?cidade=${cidade}`);
        const dados = await res.json();
        
        if (dados.erro) throw new Error();

        // GARANTIA: Se o backend não mandou o nome da cidade no objeto de busca, 
        // usamos o nome que o usuário digitou ou o que o backend retornou
        cidadeAtualNome = dados.name || cidade; 

        atualizarPainelPrincipal(dados);
        await buscarPrevisaoSemanal(dados.coord.lat, dados.coord.lon);
        
        if (aviso) aviso.style.display = "none"; // Esconde após carregar
    } catch (e) { 
        if (aviso) aviso.style.display = "none";
        alert("Cidade não encontrada ou servidor offline."); 
    }
}

// 7. IA e Eventos
async function sugerirRoupaIA() {
    const localIA = document.querySelector(".resposta-ia");
    localIA.style.overflowY = "auto";
    localIA.style.maxHeight = "100px"; // Limita a altura para não empurrar os cards
    localIA.style.paddingRight = "5px";
    localIA.textContent = "IA analisando o clima...";

    try {
        const res = await fetch("https://meu-portfolio-backend-wgmj.onrender.com/api/sugerir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                clima: { 
                    cidade: cidadeAtualNome, 
                    temp: document.querySelector(".temp").textContent,
                    descricao: document.querySelector(".descricao-clima").textContent
                } 
            })
        });
        const d = await res.json();
        localIA.textContent = d.sugestao;
    } catch { localIA.textContent = "Erro ao obter dica da IA."; }
}

function detectarVoz() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return alert("Navegador não suporta voz.");
    const rec = new Recognition();
    rec.lang = 'pt-BR';
    rec.onstart = () => document.querySelector(".input-cidade").placeholder = "Ouvindo...";
    rec.onresult = (e) => {
        // Remove o ponto final que a API de voz coloca
        const transcricao = e.results[0][0].transcript.replace(/\./g, "").trim();
        document.querySelector(".input-cidade").value = transcricao;
        cliqueinoBotao(); // Agora a busca vai limpa para o servidor
    };
    rec.start();
}