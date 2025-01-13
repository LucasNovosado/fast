const express = require('express');
const path = require('path');
const Parse = require('../config/parse-config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Função auxiliar para formatar endereço
function formatarEndereco(endereco) {
   if (!endereco || endereco === '-') return '-';
   
   const partes = endereco.split(',').map(parte => parte.trim());
   if (partes.length >= 7) {
       // Pega apenas as partes desejadas: primeira, segunda, quinta e sétima
       return `${partes[0]}, ${partes[1]}, ${partes[4]}, ${partes[6]}`;
   }
   return endereco; // Retorna original se não tiver todas as partes
}

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
       const query = new Parse.Query("Entregas");
       query.descending("iniciado"); // Ordena do mais novo para o mais antigo
       const entregas = await query.find();
       
       const entregasFormatadas = entregas.map(entrega => ({
           telefone: entrega.get("telefone"),
           cep: entrega.get("cep"),
           iniciado: entrega.get("iniciado"),
           finalizado: entrega.get("finalizado"),
           localizacaoInicial: formatarEndereco(entrega.get("localizacaoInicial")),
           localizacaoFinal: formatarEndereco(entrega.get("localizacaoFinal"))
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