

// Função para atualizar o fundo conforme o clima
function atualizarFundoCaixa(clima) {
    const caixa = document.querySelector(".caixa-media");
    const imagens = {
        'Clear': 'sunny',
        'Clouds': 'clouds',
        'Rain': 'rain',
        'Thunderstorm': 'storm',
        'Snow': 'snow'
    };
    const termo = imagens[clima] || 'weather';
    const urlDinamica = `https://source.unsplash.com/featured/400x600/?${termo}`;
    caixa.style.background = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${urlDinamica}')`;
    caixa.style.backgroundSize = "cover";
    caixa.style.backgroundPosition = "center";
}

// Função auxiliar para converter graus em direção do vento
function grausParaDirecao(graus) {
    const direcoes = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
    const index = Math.round(graus / 45) % 8;
    return direcoes[index];
}

// Função principal que busca o clima atual e depois chama a previsão dos 5 dias
async function cliqueinoBotao() {
   // No scripts.js, dentro da função de busca, limpe o ponto final:
const cidade = document.querySelector(".input-cidade").value.replace(".", "").trim();
    const caixa = document.querySelector(".caixa-media");

    if (!cidade) return;

    caixa.innerHTML = `
        <div class="loading">
            <p>Buscando informações...</p>
            <div class="spinner"></div>
        </div>
    `;

    try {
        const urlAtual = `https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${chave}&units=metric&lang=pt_br`;
        const respostaAtual = await fetch(urlAtual);
        const dadosAtual = await respostaAtual.json();

        if (dadosAtual.cod === "404") {
            caixa.innerHTML = `<p>Cidade não encontrada. Tente novamente!</p>`;
            return;
        }

        atualizarFundoCaixa(dadosAtual.weather[0].main);

        caixa.innerHTML = `
            <h2 class="cidade">${dadosAtual.name}</h2>
            <p class="temp">${Math.round(dadosAtual.main.temp)}°C</p>
            <img class="icone" src="https://openweathermap.org/img/wn/${dadosAtual.weather[0].icon}@2x.png" alt="Ícone do tempo">
            <p class="umidade">${dadosAtual.main.humidity}% Umidade</p>
            <button class="botao-ia" onclick="sugerirRoupaIA()">Sugestão de Roupa IA</button>
            <p class="resposta-ia">Aguardando solicitação...</p>
            <div class="previsao-semanal"></div>
        `;

        const { lat, lon } = dadosAtual.coord;

        // Chama a função para exibir a previsão dos 5 dias
        await exibirPrevisao5Dias(lat, lon);

    } catch (error) {
        caixa.innerHTML = `<p>Erro ao buscar dados.</p>`;
        console.error(error);
    }
}
// Função para busca por voz
function detectarVoz() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'pt-BR';

    recognition.onstart = () => {
        console.log("Voz ativada, pode falar...");
        document.querySelector(".input-cidade").placeholder = "Ouvindo...";
    };

    recognition.onresult = (event) => {
        const cidade = event.results[0][0].transcript;
        document.querySelector(".input-cidade").value = cidade;
        cliqueinoBotao(); // Chama a busca automaticamente após falar
    };

    recognition.onerror = (event) => {
        console.error("Erro na voz: ", event.error);
        alert("Não consegui ouvir bem, tente novamente.");
    };

    recognition.start();
}

// Função para buscar e exibir a previsão dos próximos 5 dias
async function exibirPrevisao5Dias(lat, lon) {
    const caixa = document.querySelector(".caixa-media .previsao-semanal");
    const url5dias = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${chave}&units=metric&lang=pt_br`;

    try {
        const resposta = await fetch(url5dias);
        if (!resposta.ok) throw new Error(`Erro na API: ${resposta.status}`);

        const dados = await resposta.json();

        // Agrupar dados por dia
        const previsaoPorDia = {};

        dados.list.forEach(item => {
            const data = item.dt_txt.split(' ')[0];
            if (!previsaoPorDia[data]) {
                previsaoPorDia[data] = {
                    temp_min: item.main.temp_min,
                    temp_max: item.main.temp_max,
                    chuva: item.pop || 0,
                    vento: item.wind.speed,
                    umidade: item.main.humidity,
                    icon: item.weather[0].icon,
                    descricao: item.weather[0].description
                };
            } else {
                previsaoPorDia[data].temp_min = Math.min(previsaoPorDia[data].temp_min, item.main.temp_min);
                previsaoPorDia[data].temp_max = Math.max(previsaoPorDia[data].temp_max, item.main.temp_max);
                previsaoPorDia[data].chuva = Math.max(previsaoPorDia[data].chuva, item.pop || 0);
                previsaoPorDia[data].vento = Math.max(previsaoPorDia[data].vento, item.wind.speed);
                previsaoPorDia[data].umidade = Math.max(previsaoPorDia[data].umidade, item.main.humidity);
            }
        });

        let html = '<h3>Previsão para os próximos dias</h3><div class="dias-semana">';

        Object.entries(previsaoPorDia).slice(0, 5).forEach(([data, info]) => {
            const dataFormatada = new Date(data + "T12:00:00").toLocaleDateString('pt-BR', { weekday: 'short' });
            html += `
                <div class="dia">
                    <h4>${dataFormatada}</h4>
                    <img src="https://openweathermap.org/img/wn/${info.icon}@2x.png" alt="${info.descricao}">
                    <p><strong>Máx:</strong> ${Math.round(info.temp_max)}°C / <strong>Mín:</strong> ${Math.round(info.temp_min)}°C</p>
                    <p><strong>Chuva:</strong> ${Math.round(info.chuva * 100)}%💧</p>
                    <p><strong>Vento:</strong> ${Math.round(info.vento)} m/s</p>
                    <p><strong>Umidade:</strong> ${info.umidade}%</p>
                </div>
            `;
        });

        html += '</div>';
        caixa.innerHTML = html;

    } catch (error) {
        caixa.innerHTML = `<p>Erro ao carregar a previsão.</p>`;
        console.error(error);
    }
}

// Função para sugerir roupa via IA
async function sugerirRoupaIA() {
    const temperatura = document.querySelector(".temp").textContent;
    const umidade = document.querySelector(".umidade").textContent;
    const cidade = document.querySelector(".cidade").textContent;
    const localResposta = document.querySelector(".resposta-ia");

    localResposta.textContent = "IA pensando...";

    try {
        const respostaIA = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${chaveIA}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "user",
                        content: `Sugira uma roupa curta e objetiva para a cidade de: ${cidade} 
                        com temperatura de: ${temperatura} 
                        e umidade de ${umidade}. A resposta deve ser em 3 frases curtas.`
                    }
                ]
            })
        });

        const dados = await respostaIA.json();
        const sugestao = dados.choices[0].message.content;
        localResposta.textContent = sugestao;
    } catch (err) {
        localResposta.textContent = "Erro ao falar com a IA.";
        console.error(err);
    }
}

// Evento ENTER para buscar clima ao digitar na input
document.querySelector(".input-cidade").addEventListener("keyup", event => {
    if (event.key === "Enter") {
        cliqueinoBotao();
    }
});