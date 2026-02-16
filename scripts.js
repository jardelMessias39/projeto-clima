let listaCompletaGlobal = [];    // Sempre mantém todos os dias da previsão
let climaDeHoje = null;          // Destaque principal
let somAmbiente = null;          // Som ambiente do clima
let cidadeAtualNome = "";        // Nome da cidade fixo no topo

// 2. Tradução Senior para PT-BR
function formatarDiaPT(dataTexto) {
    if (!dataTexto) return "---";
    // Adicionamos o T12:00:00 para evitar que o fuso horário mude o dia
    const data = new Date(dataTexto + 'T12:00:00');
    return data.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
}

// 1. Função para abrir o projeto e destravar áudio
window.abrirProjeto = function() {
  
    const launcher = document.getElementById('launcher');
    const projeto = document.getElementById('conteudo-projeto');

    if (launcher) launcher.style.display = 'none';
    
    if (projeto) {
        projeto.style.display = 'flex';
        setTimeout(() => { 
            projeto.style.opacity = '1'; 
        }, 10);
    }
};
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
    const elementos = {
        cidade: document.querySelector(".nome-cidade"),
        temp: document.querySelector(".temp"),
        desc: document.querySelector(".descricao-clima"),
        icone: document.querySelector(".icone"),
        destaque: document.querySelector(".dia-destaque"),
        detalhes: document.querySelector(".detalhes")
    };

    // Nome da cidade (mantém global)
    if (dados.name) cidadeAtualNome = dados.name;
    if (elementos.cidade) elementos.cidade.textContent = cidadeAtualNome;

    // Dia da semana
    if (elementos.destaque) {
        if (dados.dataLabel) {
            elementos.destaque.textContent = dados.dataLabel;
        } else if (dados.fullDate) {
            elementos.destaque.textContent = formatarDiaPT(dados.fullDate);
        } else {
            const hoje = new Date();
            elementos.destaque.textContent =
                hoje.toLocaleDateString("pt-BR", { weekday: "short" })
                    .toUpperCase()
                    .replace(".", "");
        }
    }

    // Temperatura
    const tempValue = Math.round(dados.main?.temp || dados.temp_max || 0);
    if (elementos.temp) elementos.temp.textContent = `${tempValue}°C`;

    // Descrição
    const desc = (dados.weather?.[0].description || dados.climaPrincipal || '').toUpperCase();
    if (elementos.desc) elementos.desc.textContent = desc;

    // Ícone
    const iconeCodigo = dados.weather?.[0].icon || dados.icon || '01d';
    if (elementos.icone) {
        elementos.icone.style.display = "block";
        elementos.icone.src = `https://openweathermap.org/img/wn/${iconeCodigo}@4x.png`;
    }

    // Detalhes
    if (elementos.detalhes) {
        const sensacao = Math.round(dados.main?.feels_like || dados.sensacao || 0);
        const umidade = dados.main?.humidity || dados.umidade || 0;
        const vento = dados.wind?.speed || dados.vento || 0;
        const pressao = dados.main?.pressure || dados.pressao || 0;

        elementos.detalhes.innerHTML = `
            <p>Sensação: ${sensacao}°C</p>
            <p>Umidade: ${umidade}%</p>
            <p>Vento: ${Math.round(vento * 3.6)} km/h</p>
            <p>Pressão: ${pressao} hPa</p>
        `;
    }

    // Fundo e som
    atualizarFundoCaixa(dados.weather?.[0].main || dados.climaPrincipal);
    tocarSomAmbienteComCodigo(dados.weather || [{id: 800}]);
}


function normalizarDadosClima(dados, fullDate = null, dataLabel = null) {
    return {
        nome: dados.name,
        temp: dados.main?.temp ?? dados.temp_max ?? 0,
        descricao: dados.weather?.[0]?.description ?? dados.climaPrincipal ?? "",
        icone: dados.weather?.[0]?.icon ?? dados.icon ?? "01d",
        sensacao: dados.main?.feels_like ?? dados.sensacao ?? 0,
        umidade: dados.main?.humidity ?? dados.umidade ?? 0,
        vento: dados.wind?.speed ?? dados.vento ?? 0,
        pressao: dados.main?.pressure ?? dados.pressao ?? 0,
        climaPrincipal: dados.weather?.[0]?.main ?? dados.climaPrincipal ?? "Clear",
        fullDate: fullDate,       // necessário para o filtro do destaque
        dataLabel: dataLabel      // nome do dia em PT-BR
    }
}


// 4. Renderizar os cards debaixo
function renderizarCards() {
    const container = document.querySelector(".previsao-semanal");
    if (!container) return;
    container.innerHTML = "";

    if (!listaCompletaGlobal || listaCompletaGlobal.length === 0) return;

    listaCompletaGlobal.forEach(dia => {
        // Pula o destaque atual
        if (climaDeHoje && dia.fullDate === climaDeHoje.fullDate) return;

        const card = document.createElement("div");
        card.className = "card-previsao";

        const diaNome = dia.dataLabel || formatarDiaPT(dia.fullDate);
        const probChuva = dia.chuva ?? dia.pop ?? 0;

        card.innerHTML = `
            <h4>${diaNome}</h4>
            <img src="https://openweathermap.org/img/wn/${dia.icon || '01d'}@2x.png">
            <p class="card-temp"><strong>${Math.round(dia.temp_max || 0)}°</strong></p>
            <p class="card-chuva">💧${Math.round(probChuva * 100)}%</p>
        `;

         card.onclick = () => {
    climaDeHoje = normalizarDadosClima(dia);
    atualizarPainelPrincipal(climaDeHoje);
    renderizarCards();
    };


        container.appendChild(card);
    });
}




// 5. Busca Previsão Semanal
async function buscarPrevisaoSemanal(lat, lon) {
    try {
        const url = `https://meu-portfolio-backend-wgmj.onrender.com/api/previsao?lat=${lat}&lon=${lon}`;
        const res = await fetch(url);
        if (!res.ok) return console.error("Erro ao buscar previsão semanal:", res.status);

        const dados = await res.json();

      listaCompletaGlobal = dados.map(dia => 
    normalizarDadosClima(dia, dia.fullDate, dia.dataLabel)
);

        // Destaque inicial
        if (!climaDeHoje && listaCompletaGlobal.length > 0) {
            climaDeHoje = listaCompletaGlobal[0];
            atualizarPainelPrincipal(climaDeHoje);
        }

        renderizarCards();
    } catch (e) {
        console.error("Erro na previsão:", e);
    }
}

// 6. Clique no Botão
async function cliqueinoBotao() {
    const cidadeInput = document.querySelector(".input-cidade").value.trim();
    if (!cidadeInput) return;

    const cidadeFormatada = encodeURIComponent(cidadeInput);
    const aviso = document.querySelector(".loading-aviso");
    if (aviso) aviso.style.display = "block";

    try {
        const url = `https://meu-portfolio-backend-wgmj.onrender.com/api/clima?cidade=${cidadeFormatada}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Cidade não encontrada");

        const dadosBrutos = await res.json();
        const dados = normalizarDadosClima(dadosBrutos);
        cidadeAtualNome = dados.name || cidadeInput;
        climaDeHoje = dados;

        atualizarPainelPrincipal(dados);

        if (dadosBrutos.coord) {
    await buscarPrevisaoSemanal(dadosBrutos.coord.lat, dadosBrutos.coord.lon);
}
        if (aviso) aviso.style.display = "none";
    } catch (e) {
        if (aviso) aviso.style.display = "none";
        console.warn("Erro ao processar busca:", e);
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