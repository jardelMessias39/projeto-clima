const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. ROTA PARA BUSCAR O CLIMA ATUAL (Faltava esta!)
app.get('/clima', async (req, res) => {
    const cidade = req.query.cidade;
    const chave = process.env.OPENWEATHER_KEY;
    
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${chave}&units=metric&lang=pt_br`;
        const resposta = await axios.get(url);
        res.json(resposta.data);
    } catch (error) {
        console.error("Erro na rota /clima:", error.message);
        res.status(404).json({ erro: "Cidade não encontrada" });
    }
});

// 2. ROTA PARA PREVISÃO DE 5 DIAS (CORRIGIDA)
app.get('/previsao', async (req, res) => {
    const { lat, lon } = req.query;
    const chave = process.env.OPENWEATHER_KEY;

    if (!lat || !lon) {
        return res.status(400).json({ erro: "Parâmetros 'lat' e 'lon' são obrigatórios." });
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${chave}&units=metric&lang=pt_br`;
        const resposta = await axios.get(url);

        const diasAgrupados = {};
        
        // Pegamos a data de hoje para evitar mostrar dias que já passaram
        const hoje = new Date().toISOString().split('T')[0];

        resposta.data.list.forEach(item => {
            const data = item.dt_txt.split(' ')[0]; // yyyy-mm-dd

            // Agrupamos apenas um registro por dia (preferencialmente o das 12:00 ou o primeiro que aparecer)
            if (!diasAgrupados[data]) {
                const dataObj = new Date(data + 'T12:00:00');
                
                diasAgrupados[data] = {
                    dataLabel: dataObj.toLocaleDateString('pt-BR', { weekday: 'short' })
                        .replace('.', '')
                        .toUpperCase(),
                    temp_max: Math.round(item.main.temp_max),
                    temp_min: Math.round(item.main.temp_min),
                    umidade: item.main.humidity,
                    pressao: item.main.pressure,
                    sensacao: item.main.feels_like, // ADICIONADO PARA O FRONT
                    vento: item.wind.speed,         // ADICIONADO PARA O FRONT (FIM DO NaN)
                    chuva: item.pop || 0,
                    icon: item.weather[0].icon,
                    climaPrincipal: item.weather[0].main, // ESSENCIAL PARA O SOM
                    weather: item.weather,                 // ESSENCIAL PARA O SOM
                    fullDate: data
                };
            } else {
                // Atualiza a máxima e mínima do dia conforme novos horários são lidos
                diasAgrupados[data].temp_max = Math.max(diasAgrupados[data].temp_max, Math.round(item.main.temp_max));
                diasAgrupados[data].temp_min = Math.min(diasAgrupados[data].temp_min, Math.round(item.main.temp_min));
                diasAgrupados[data].chuva = Math.max(diasAgrupados[data].chuva, item.pop);
            }
        });

        // Transformamos o objeto em array e pegamos apenas os próximos 5 ou 6 dias
        const resultadoFinal = Object.values(diasAgrupados).slice(0, 6);

        res.json(resultadoFinal);
    } catch (error) {
        console.error('Erro na rota /previsao:', error.message);
        res.status(500).json({ erro: 'Erro ao buscar previsão' });
    }
});

// 3. ROTA PARA A IA (Sugerir Roupa)
app.post('/sugerir', async (req, res) => {
    const { clima } = req.body;
    const chaveIA = process.env.GROQ_KEY;

    try {
        const resposta = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama3-8b-8192",
            messages: [{
                role: "user", 
                content: `O clima em ${clima.cidade} é ${clima.descricao} com ${clima.temp}°C. Que roupa devo usar? Responda em uma frase curta.`
            }]
        }, {
            headers: { 'Authorization': `Bearer ${chaveIA}` }
        });

        res.json({ sugestao: resposta.data.choices[0].message.content });
    } catch (error) {
        console.error("Erro na IA:", error.message);
        res.status(500).json({ erro: "Erro na IA" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando redondinho na porta ${PORT}`);
});