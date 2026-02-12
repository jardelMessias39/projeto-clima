let listaCompletaGlobal = [];
let climaDeHoje = null;
let somAmbiente = null;

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
    const elementos = {
        cidade: document.querySelector(".cidade") || document.querySelector(".nome-cidade"),
        temp: document.querySelector(".temp"),
        desc: document.querySelector(".descricao-clima"),
        icone: document.querySelector(".icone"),
        umidade: document.querySelector(".umidade"),
        pressao: document.querySelector(".pressao"),
        vento: document.querySelector(".vento"),
        destaque: document.querySelector(".dia-destaque")
    };

    if (elementos.cidade) elementos.cidade.textContent = dados.name || dados.cidade || "Localização";
    if (elementos.destaque) elementos.destaque.textContent = dados.dataLabel || "HOJE";
    
    const tempValue = Math.round(dados.main?.temp || dados.temp_max || 0);
    if (elementos.temp) elementos.temp.textContent = `${tempValue}°C`;

    const desc = (dados.weather?.[0].description || dados.climaPrincipal || '').toUpperCase();
    if (elementos.desc) elementos.desc.textContent = desc;

    const icone = dados.weather?.[0].icon || dados.icon || '01d';
    if (elementos.icone) elementos.icone.src = `https://openweathermap.org/img/wn/${icone}@4x.png`;

    // Detalhes extras (SÓ PREENCHE SE EXISTIR NO HTML)
    if (elementos.umidade) {
        const u = dados.main?.humidity ?? dados.umidade ?? 0;
        elementos.umidade.textContent = `💧 Umidade: ${u}%`;
    }
    if (elementos.vento) {
        const v = Math.round(dados.wind?.speed ?? dados.vento ?? 0);
        elementos.vento.textContent = `💨 Vento: ${v} m/s`;
    }

    atualizarFundoCaixa(dados.weather?.[0].main || dados.climaPrincipal);
    tocarSomAmbienteComCodigo(dados.weather);
}

// 4. Renderizar os cards debaixo
function renderizarCards() {
    const container = document.querySelector(".previsao-semanal");
    if (!container || !climaDeHoje) return;

    container.innerHTML = "";
    const dataNoDestaque = climaDeHoje.fullDate; 
    const diasParaExibir = listaCompletaGlobal.filter(dia => dia.fullDate !== dataNoDestaque);

    diasParaExibir.slice(0, 6).forEach(dia => {
        const card = document.createElement("div");
        card.className = "card-previsao";
        card.innerHTML = `
            <h4>${dia.dataLabel}</h4>
            <img src="https://openweathermap.org/img/wn/${dia.icon}@2x.png">
            <p class="card-temp"><strong>${Math.round(dia.temp_max)}°</strong></p>
            <p class="card-chuva">💧${Math.round(dia.chuva * 100)}%</p>
        `;
        card.onclick = () => {
            climaDeHoje = dia; 
            atualizarPainelPrincipal(dia);
            renderizarCards();
        };
        container.appendChild(card);
    });
}

// 5. Busca Previsão Semanal
async function buscarPrevisaoSemanal(lat, lon) {
    try {
        const res = await fetch(`https://meu-portfolio-backend-wgmj.onrender.com/api/previsao?lat=${lat}&lon=${lon}`);
        listaCompletaGlobal = await res.json();
        if (!climaDeHoje) climaDeHoje = listaCompletaGlobal[0];
        renderizarCards(); 
    } catch (e) { console.error("Erro na previsão:", e); }
}

// 6. Clique no Botão
async function cliqueinoBotao() {
    const cidade = document.querySelector(".input-cidade").value.trim();
    const caixa = document.querySelector(".caixa-media");
    if (!cidade) return;

    caixa.innerHTML = `<div class="loading"><p>Buscando...</p><div class="spinner"></div></div>`;

    try {
        const res = await fetch(`https://meu-portfolio-backend-wgmj.onrender.com/api/clima?cidade=${cidade}`);
        const dados = await res.json();
        if (dados.erro || !dados.coord) throw new Error();

        // Monta o HTML interno da caixa para o CSS aplicar os estilos
        caixa.innerHTML = `
            <h2 class="cidade">${dados.name}</h2>
            <p class="temp">${Math.round(dados.main.temp)}°C</p>
            <p class="descricao-clima">${dados.weather[0].description}</p>
            <img class="icone" src="https://openweathermap.org/img/wn/${dados.weather[0].icon}@2x.png">
            <div class="detalhes">
                <p class="umidade">💧 Umidade: ${dados.main.humidity}%</p>
                <p class="vento">💨 Vento: ${Math.round(dados.wind.speed)} m/s</p>
            </div>
            <button class="botao-ia" onclick="sugerirRoupaIA()">✨ Dica da IA</button>
            <p class="resposta-ia">O que vestir hoje?</p>
            <div class="previsao-semanal"></div>
        `;

        climaDeHoje = null;
        atualizarPainelPrincipal(dados);
        await buscarPrevisaoSemanal(dados.coord.lat, dados.coord.lon);
    } catch (e) {
        caixa.innerHTML = `<p>Cidade não encontrada.</p>`;
    }
}

// 7. IA e Eventos
async function sugerirRoupaIA() {
    const local = document.querySelector(".resposta-ia");
    const cidade = document.querySelector(".cidade")?.textContent || "sua cidade";
    const temp = document.querySelector(".temp")?.textContent || "20°C";
    local.textContent = "IA analisando...";

    try {
        const res = await fetch("https://meu-portfolio-backend-wgmj.onrender.com/api/sugerir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clima: { cidade, temp, descricao: "atual" } })
        });
        const d = await res.json();
        local.textContent = d.sugestao;
    } catch { local.textContent = "Erro na IA."; }
}

function detectarVoz() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return alert("Navegador não suporta voz.");
    const rec = new Recognition();
    rec.lang = 'pt-BR';
    rec.onstart = () => document.querySelector(".input-cidade").placeholder = "Ouvindo...";
    rec.onresult = (e) => {
        document.querySelector(".input-cidade").value = e.results[0][0].transcript;
        cliqueinoBotao();
    };
    rec.start();
}

document.querySelector(".input-cidade").addEventListener("keyup", e => { if (e.key === "Enter") cliqueinoBotao(); });