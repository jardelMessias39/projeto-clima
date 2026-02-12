let climaDeHoje = null;
let somAmbiente = null;

// Atualizar fundo da caixa conforme clima
function atualizarFundoCaixa(climaPrincipal) {
    const caixaMedia = document.querySelector(".caixa-media");

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
   const urlFoto = `https://source.unsplash.com/1600x900/?${busca}`;
    caixaMedia.style.backgroundImage = `url('${urlFoto}')`;
}

// Atualizar painel principal com dados detalhados
function atualizarPainelPrincipal(dados) {
    const cidadeNome = document.querySelector(".cidade");
    const tempPrincipal = document.querySelector(".temp");
    const tempMaxMin = document.querySelector(".temp-max-min");
    const iconePrincipal = document.querySelector(".icone");
    const umidadePrincipal = document.querySelector(".umidade");
    const pressaoPrincipal = document.querySelector(".pressao");
    const ventoPrincipal = document.querySelector(".vento");
    const descricaoClima = document.querySelector(".descricao-clima");

    const nomeCidade = document.querySelector(".nome-cidade");
    const diaDestaque = document.querySelector(".dia-destaque");

    nomeCidade.textContent = dados.name || "Localização desconhecida";
    diaDestaque.textContent = dados.dataLabel || (dados.weather?.[0].main || "").toUpperCase();
        tempPrincipal.textContent = `${Math.round(dados.main?.temp || dados.temp_max || 0)}°C`;

    tempMaxMin.textContent = `Máx: ${Math.round(dados.main?.temp_max || dados.temp_max || 0)}°C | Mín: ${Math.round(dados.main?.temp_min || dados.temp_min || 0)}°C`;

    // Garantir que o ícone não fique vazio e com fallback "sol"
    const icone = dados.weather?.[0].icon || dados.icon || '01d';
    iconePrincipal.src = `https://openweathermap.org/img/wn/${icone}@4x.png`;
    iconePrincipal.alt = dados.weather?.[0].description || 'Ícone do clima';

    descricaoClima.textContent = (dados.weather?.[0].description || dados.climaPrincipal || '').toUpperCase();

    const umidadeValue = dados.main?.humidity ?? dados.umidade ?? 0;
    umidadePrincipal.textContent = `💧 Umidade: ${umidadeValue}%`;

    const pressaoValue = dados.main?.pressure ?? dados.pressao ?? 0;
    pressaoPrincipal.textContent = `🌡️ Pressão: ${pressaoValue} hPa`;

    // Corrigir NaN no vento com fallback zero
    const ventoValue = Math.round(dados.wind?.speed ?? dados.vento ?? 0);
    ventoPrincipal.textContent = `💨 Vento: ${ventoValue} m/s`;

    atualizarFundoCaixa(dados.weather?.[0].main || dados.climaPrincipal);

    // Opcional: tocar som ambiente conforme clima
    tocarSomAmbienteComCodigo(dados.weather);
}

// Função para tocar som ambiente baseado no código do clima
function tocarSomAmbienteComCodigo(weather) {
    if (!weather || !weather[0]) return;

    const id = weather[0].id;
    let urlSom = "";

    if (id >= 200 && id <= 232) {
        urlSom = "./sons/som-do-trovao.mp3";
    } else if (id >= 300 && id <= 321) {
        urlSom = "./sons/som-da-chuva.mp3";
    } else if (id >= 500 && id <= 531) {
        urlSom = "./sons/som-da-chuva.mp3";
    } else if (id >= 600 && id <= 622) {
        urlSom = "./sons/som-de-neve.mp3";
    } else if (id === 800) {
        urlSom = "./sons/som-do-vento.mp3";
    } else if (id >= 801 && id <= 804) {
        urlSom = "./sons/som-do-vento.mp3";
    } else {
        return; // Sem som para outros casos
    }

    if (somAmbiente) {
        somAmbiente.pause();
        somAmbiente.currentTime = 0;
        somAmbiente = null;
    }

    somAmbiente = new Audio(urlSom);
    somAmbiente.loop = true;
    somAmbiente.volume = 0.15;
    somAmbiente.play().catch(e => console.log("Erro ao tocar som:", e));
}

// Buscar e agrupar previsão semanal
async function buscarPrevisaoSemanal(lat, lon) {
    try {
       const resposta = await fetch(`https://meu-portfolio-backend-wgmj.onrender.com/api/previsao?lat=${lat}&lon=${lon}`);

        // Sempre define o primeiro dia da lista como o destaque inicial (Hoje)
        if (!climaDeHoje) {
            climaDeHoje = listaDias[0];
        }

        atualizarPainelPrincipal(climaDeHoje);
        
        // Passamos a lista completa e o OBJETO do dia que está em destaque
        renderizarCards(listaDias, climaDeHoje); 
    } catch (error) {
        console.error("Erro na previsão semanal", error);
    }
}
// Função para renderizar os cards, excluindo o dia em destaque
function renderizarCards() {
    const container = document.querySelector(".previsao-semanal");
    if (!container) return;
    container.innerHTML = "";

    // Pegamos a DATA que está no destaque agora (ex: 2026-02-12)
    // Precisamos que a função atualizarPainelPrincipal salve essa data em algum lugar
    const dataNoDestaque = climaDeHoje.fullDate; 

    // O Filtro agora usa a DATA REAL, que é única, e não o nome do dia
    const diasParaExibir = listaCompletaGlobal.filter(dia => dia.fullDate !== dataNoDestaque);

    // Mostra os próximos 6 dias
    diasParaExibir.slice(0, 6).forEach(dia => {
        const card = document.createElement("div");
        card.className = "card-previsao";
        card.innerHTML = `
            <h4>${dia.dataLabel}</h4>
            <img src="https://openweathermap.org/img/wn/${dia.icon}@2x.png">
            <p class="card-temp"><strong>${Math.round(dia.temp_max)}°</strong> ${Math.round(dia.temp_min)}°</p>
            <p class="card-chuva">💧${Math.round(dia.chuva * 100)}%</p>
        `;

        card.onclick = () => {
            climaDeHoje = dia; 
            atualizarPainelPrincipal(dia);
            renderizarCards(); // Re-renderiza: o novo dia some de baixo e o antigo volta!
        };
        container.appendChild(card);
    });
}
// Função principal para buscar clima ao clicar no botão ou Enter
async function cliqueinoBotao() {
    const campoInput = document.querySelector(".input-cidade");
    const cidade = campoInput.value.replace(/\./g, "").trim();
    const caixa = document.querySelector(".caixa-media");
    if (!cidade) return;

    caixa.innerHTML = `<div class="loading"><p>Buscando...</p><div class="spinner"></div></div>`;

    try {
        const resposta = await fetch(`https://meu-portfolio-backend-wgmj.onrender.com/api/previsao?lat=${lat}&lon=${lon}`);
        if (!resposta.ok) throw new Error();
        const dados = await resposta.json();

        caixa.innerHTML = `
            <h2 class="cidade"></h2>
            <p class="temp"></p>
            <p class="descricao-clima"></p>
            <img class="icone" src="" alt="clima">
            <p class="temp-max-min"></p>
            <p class="umidade"></p>
            <p class="pressao"></p>
            <p class="vento"></p>
            <button class="botao-ia" onclick="sugerirRoupaIA()">✨ Dica da IA</button>
            <p class="resposta-ia">O que vestir hoje?</p>
            <div class="previsao-semanal"></div>
        `;

        atualizarPainelPrincipal(dados);
        await buscarPrevisaoSemanal(dados.coord.lat, dados.coord.lon);

    } catch (error) {
        caixa.innerHTML = `<p>Cidade não encontrada. Tente novamente!</p>`;
    }
}
// IA e Eventos (mantidos e integrados)
async function sugerirRoupaIA() {
    const local = document.querySelector(".resposta-ia");
    const cidade = document.querySelector(".cidade").textContent;
    const temp = document.querySelector(".temp").textContent;
    
    local.textContent = "IA analisando o guarda-roupa...";

    try {
const res = await fetch("https://meu-portfolio-backend-wgmj.onrender.com/api/sugerir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clima: { cidade, temp, descricao: "atual" } })
        });
        const d = await res.json();
        local.textContent = d.sugestao;
    } catch {
        local.textContent = "IA ficou tímida. Tente de novo!";
    }
}

document.querySelector(".input-cidade").addEventListener("keyup", e => { if (e.key === "Enter")
     cliqueinoBotao(); });
// --- FUNÇÃO DE VOZ (Corrigindo o Erro do Botão) ---
function detectarVoz() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'pt-BR';

    recognition.onstart = () => {
        document.querySelector(".input-cidade").placeholder = "Ouvindo...";
    };

    recognition.onresult = (event) => {
        const cidadevoz = event.results[0][0].transcript;
        document.querySelector(".input-cidade").value = cidadevoz;
        cliqueinoBotao(); // Busca automaticamente
    };

    recognition.onerror = () => {
        alert("Não consegui ouvir. Tente novamente!");
        document.querySelector(".input-cidade").placeholder = "Digite a cidade...";
    };

    recognition.start();
}

// --- EVENTO DE TECLADO ---
document.querySelector(".input-cidade").addEventListener("keyup", event => {
    if (event.key === "Enter") {
        cliqueinoBotao();
    }
});