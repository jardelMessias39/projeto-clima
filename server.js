const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Rota para clima atual (sem alterações)
app.get('/clima', async (req, res) => {
    const cidade = req.query.cidade;
    const chave = process.env.OPENWEATHER_KEY;

    if (!cidade) {
        return res.status(400).json({ erro: "Parâmetro 'cidade' é obrigatório." });
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${chave}&units=metric&lang=pt_br`;
        const resposta = await axios.get(url);
        res.json(resposta.data);
    } catch (error) {
        console.error("Erro na rota /clima:", error.message);
        res.status(404).json({ erro: "Cidade não encontrada" });
    }
});

// Rota para previsão 5 dias - já agrupada por dia
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

        resposta.data.list.forEach(item => {
            const data = item.dt_txt.split(' ')[0];

            if (!diasAgrupados[data]) {
                diasAgrupados[data] = {
                    dataLabel: new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
                    temp_max: item.main.temp_max,
                    temp_min: item.main.temp_min,
                    umidade: item.main.humidity,
                    pressao: item.main.pressure,
                    chuva: item.pop || 0,
                    icon: item.weather[0].icon,
                    climaPrincipal: item.weather[0].main,
                    fullDate: data
                };
            } else {
                diasAgrupados[data].temp_max = Math.max(diasAgrupados[data].temp_max, item.main.temp_max);
                diasAgrupados[data].temp_min = Math.min(diasAgrupados[data].temp_min, item.main.temp_min);
                diasAgrupados[data].umidade = item.main.humidity; // Você pode melhorar calculando média se quiser
                diasAgrupados[data].pressao = item.main.pressure;
                diasAgrupados[data].chuva = Math.max(diasAgrupados[data].chuva, item.pop);
            }
        });

        res.json(Object.values(diasAgrupados));
    } catch (error) {
        console.error('Erro na rota /previsao:', error.message);
        res.status(500).json({ erro: 'Erro ao buscar previsão' });
    }
});

// Rota para IA - sugestão de roupa (sem alterações)
app.post('/sugerir', async (req, res) => {
    const { clima } = req.body;
    const chaveIA = process.env.GROQ_KEY;

    console.log("Solicitando sugestão para:", clima.cidade);

    try {
        const resposta = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.3-70b-versatile",
            messages: [{
                role: "user",
                content: `O clima em ${clima.cidade} está ${clima.descricao} com ${clima.temp}. Que roupa devo usar? Responda de forma curta em até 3 frases.`
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${chaveIA}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({ sugestao: resposta.data.choices[0].message.content });
    } catch (error) {
        console.error("Erro detalhado na Groq:", error.response ? error.response.data : error.message);
        res.status(500).json({ erro: "A IA demorou a responder, tente novamente." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});