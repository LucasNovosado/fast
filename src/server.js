const express = require('express');
const path = require('path');
const Parse = require('../config/parse-config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

function formatarEndereco(endereco) {
    // Se o endereço for vazio ou igual a '-', retorna '-'
    if (!endereco || endereco === '-') return '-';
    
    // Divide o endereço em partes e remove espaços em branco
    let partes = endereco.split(',').map(parte => parte.trim());
    
    // Filtra as partes removendo:
    // - Partes que contêm "Região"
    // - Partes que contêm "Brasil"
    // - Partes duplicadas (mantendo apenas a primeira ocorrência)
    const partesUnicas = [];
    const partesVistas = new Set();
    
    partes = partes.filter(parte => {
        // Ignora partes que contêm "Região" ou "Brasil"
        if (parte.includes('Região') || parte.includes('Brasil')) {
            return false;
        }
        
        // Remove duplicatas mantendo apenas a primeira ocorrência
        if (!partesVistas.has(parte)) {
            partesVistas.add(parte);
            partesUnicas.push(parte);
            return true;
        }
        return false;
    });
    
    return partes.join(', ');
}

// Teste com seu endereço
const endereco = "Rua Desembargador Clotário Portugal, Centro, Apucarana, Apucarana, Região Geográfica Imediata de Apucarana, Região Geográfica Intermediária de Londrina, Paraná, Região Sul, 86800-090, Brasil";
console.log('\nResultado formatado:');
console.log(formatarEndereco(endereco));

// Endpoint para calcular média de entregas
app.get('/api/media-entregas', async (req, res) => {
   try {
       const query = new Parse.Query("Entregas");
       query.exists("finalizado");
       query.exists("iniciado");
       const entregas = await query.find();
       
       if (entregas.length === 0) {
           return res.json({ media: 0, totalEntregas: 0 });
       }

       let somaMinutos = 0;
       entregas.forEach(entrega => {
           const iniciado = new Date(entrega.get("iniciado"));
           const finalizado = new Date(entrega.get("finalizado"));
           const diferencaMinutos = Math.max(0, (finalizado - iniciado) / (1000 * 60));
           somaMinutos += diferencaMinutos;
       });

       const mediaMinutos = Math.max(0, somaMinutos / entregas.length);
       
       res.json({
           media: Math.round(mediaMinutos),
           totalEntregas: entregas.length
       });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

// Endpoint para criar nova entrega
app.post('/api/entrega', async (req, res) => {
   try {
       const { telefone, cep, localizacaoInicial } = req.body;
       console.log('Dados recebidos:', { telefone, cep, localizacaoInicial });
       
       const Entrega = Parse.Object.extend("Entregas");
       const entrega = new Entrega();
       
       entrega.set("telefone", telefone);
       entrega.set("cep", cep);
       entrega.set("iniciado", new Date());
       entrega.set("localizacaoInicial", localizacaoInicial);
       
       await entrega.save();
       
       res.json({ success: true, objectId: entrega.id });
   } catch (error) {
       console.error('Erro ao salvar entrega:', error);
       res.status(500).json({ error: error.message });
   }
});

// Endpoint para finalizar entrega
app.put('/api/entrega/:id/finalizar', async (req, res) => {
   try {
       const { id } = req.params;
       const { localizacaoFinal } = req.body;
       
       const query = new Parse.Query("Entregas");
       const entrega = await query.get(id);
       
       entrega.set("finalizado", new Date());
       entrega.set("localizacaoFinal", localizacaoFinal);
       await entrega.save();
       
       res.json({ success: true });
   } catch (error) {
       res.status(500).json({ error: error.message });
   }
});

// Endpoint para listar todas as entregas

app.get('/api/entregas', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const query = new Parse.Query("Entregas");
        // Apenas entregas que possuem data de finalização
        query.exists("finalizado");
        query.notEqualTo("finalizado", null);
        query.descending("iniciado");
        
        // Primeiro, pegamos o total de registros para a paginação
        const total = await query.count();
        
        // Depois aplicamos o skip e limit para pegar apenas os registros da página atual
        query.skip(skip);
        query.limit(limit);
        
        const entregas = await query.find();
        
        const entregasFormatadas = entregas.map(entrega => ({
            telefone: entrega.get("telefone"),
            cep: entrega.get("cep"),
            iniciado: entrega.get("iniciado"),
            finalizado: entrega.get("finalizado"),
            localizacaoInicial: (entrega.get("localizacaoInicial")),
            localizacaoFinal: formatarEndereco(entrega.get("localizacaoFinal"))
        }));
        
        res.json({
            entregas: entregasFormatadas,
            total,
            totalPaginas: Math.ceil(total / limit),
            paginaAtual: page
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// No server.js, adicione um novo endpoint para buscar entregas em andamento:

app.get('/api/entregas-em-andamento', async (req, res) => {
    try {
        const query = new Parse.Query("Entregas");
        query.doesNotExist("finalizado");
        query.ascending("iniciado");
        const entregas = await query.find();
        
        const entregasFormatadas = entregas.map(entrega => ({
            id: entrega.id,
            telefone: entrega.get("telefone"),
            iniciado: entrega.get("iniciado")
        }));
        
        res.json({ entregas: entregasFormatadas });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Iniciar o servidor
app.listen(PORT, () => {
   console.log(`Servidor rodando na porta ${PORT}`);
});