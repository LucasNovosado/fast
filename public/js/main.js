document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('entregaForm');
    const telefoneInput = document.getElementById('telefone');
    const enderecoInput = document.getElementById('endereco'); // Changed from cep to endereco

    // Event listener do formulário
    form.addEventListener('submit', handleSubmit);

    // Event listeners dos inputs
    telefoneInput.addEventListener('input', (e) => {
        // Formata o telefone
        const formattedValue = formatTelefone(e.target.value);
        e.target.value = formattedValue;
        
        // Valida o comprimento
        const numeros = formattedValue.replace(/\D/g, '');
        e.target.style.borderColor = numeros.length === 11 ? '' : 'var(--danger-color)';
    });

    enderecoInput.addEventListener('input', (e) => {
        // Valida o comprimento mínimo do endereço
        const value = e.target.value.trim();
        e.target.style.borderColor = value.length >= 3 ? '' : 'var(--danger-color)';
    });

    // Carrega os dados iniciais
    carregarMediaEntregas();
    carregarTabelaEntregas();
    carregarEntregasEmAndamento();
});

function formatTelefone(telefone) {
    // Remove tudo que não for número
    const cleaned = telefone.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const truncated = cleaned.slice(0, 11);
    
    // Aplica a máscara somente se tiver 11 dígitos
    const match = truncated.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
    }
    
    // Se não tiver 11 dígitos, retorna apenas os números
    return truncated;
}

function formatCEP(cep) {
    // Remove tudo que não for número
    const cleaned = cep.replace(/\D/g, '');
    
    // Limita a 8 dígitos
    const truncated = cleaned.slice(0, 8);
    
    // Aplica a máscara somente se tiver 8 dígitos
    const match = truncated.match(/^(\d{5})(\d{3})$/);
    if (match) {
        return `${match[1]}-${match[2]}`;
    }
    
    // Se não tiver 8 dígitos, retorna apenas os números
    return truncated;
}

function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocalização não suportada');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            position => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }),
            error => reject(error)
        );
    });
}

async function coordenadasParaEndereco(latitude, longitude) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?` + 
            `format=json&` +
            `lat=${latitude}&` +
            `lon=${longitude}&` +
            `addressdetails=1&` +
            `accept-language=pt-BR`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data || !data.address) {
            return 'Endereço não encontrado';
        }

        const avenida = data.address.road || '';
        const cidade = data.address.city || data.address.town || data.address.municipality || '';
        const estado = data.address.state || '';
        const cep = data.address.postcode || '';
        
        const endereco = `${avenida}, ${cidade}, ${estado}, ${cep}`.replace(/^,\s+/, '').replace(/,\s+,/g, ',');
        return endereco;
    } catch (error) {
        console.error('Erro ao converter coordenadas:', error);
        throw new Error('Erro ao obter endereço: ' + error.message);
    }
}

async function carregarMediaEntregas() {
    try {
        const response = await fetch('/api/media-entregas');
        const data = await response.json();
        
        const mediaText = document.getElementById('mediaText');
        const totalEntregas = document.getElementById('totalEntregas');
        
        if (data.totalEntregas === 0) {
            mediaText.textContent = "Ainda não há entregas finalizadas";
            totalEntregas.textContent = "Total de entregas: 0";
            return;
        }

        const media = data.media || 0;
        let textoMedia = '';

        if (media < 1) {
            textoMedia = "Menos de 1 minuto";
        } else {
            const horas = Math.floor(media / 60);
            const minutos = Math.round(media % 60);
            
            if (horas > 0) textoMedia += `${horas} hora${horas > 1 ? 's' : ''} `;
            if (minutos > 0 || textoMedia === '') {
                textoMedia += `${minutos} minuto${minutos > 1 ? 's' : ''}`;
            }
        }
        
        mediaText.textContent = `Média de tempo: ${textoMedia}`;
        totalEntregas.textContent = `Total de entregas: ${data.totalEntregas}`;
    } catch (error) {
        console.error('Erro ao carregar média:', error);
        document.getElementById('mediaText').textContent = "Erro ao carregar média de entregas";
    }
}

function showLoading() {
    const tbody = document.getElementById('tabelaEntregasBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="loading-cell">
                <div class="loading-spinner">
                    <i class="fas fa-circle-notch fa-spin"></i>
                    <span>Carregando entregas...</span>
                </div>
            </td>
        </tr>
    `;
}

let currentPage = 1;

async function carregarTabelaEntregas(pagina = 1) {
    try {
        showLoading();
        
        const response = await fetch(`/api/entregas?page=${pagina}`);
        const data = await response.json();
        
        const tbody = document.getElementById('tabelaEntregasBody');
        
        if (data.entregas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Nenhuma entrega finalizada encontrada</td></tr>';
            document.querySelector('.pagination-container')?.remove();
            return;
        }
        
        const totalItems = data.total;
        const linhas = data.entregas.map((entrega, index) => {
            // Cálculo do número começando do maior para o menor
            const numero = totalItems - ((data.paginaAtual - 1) * 10 + index);
            const iniciado = new Date(entrega.iniciado);
            const finalizado = new Date(entrega.finalizado);
            const duracao = calcularDuracao(iniciado, finalizado);
            
            return `
                <tr>
                    <td>${numero}</td>
                    <td>${entrega.telefone}</td>
                    <td>${entrega.cep}</td>
                    <td>${entrega.localizacaoInicial || '-'}</td>
                    <td>${entrega.localizacaoFinal || '-'}</td>
                    <td>${iniciado.toLocaleString()}</td>
                    <td>${finalizado.toLocaleString()}</td>
                    <td class="duracao">${duracao}</td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = linhas;
        
        // Criação dos controles de paginação
        if (data.totalPaginas > 1) {
            let paginationContainer = document.querySelector('.pagination-container');
            if (!paginationContainer) {
                paginationContainer = document.createElement('div');
                paginationContainer.className = 'pagination-container';
                document.getElementById('tabelaEntregas').appendChild(paginationContainer);
            }
            
            let paginationHTML = `
                <div class="pagination">
                    <button 
                        onclick="carregarTabelaEntregas(${data.paginaAtual - 1})"
                        class="btn-paginate"
                        ${data.paginaAtual === 1 ? 'disabled' : ''}
                    >
                        <i class="fas fa-chevron-left"></i> Anterior
                    </button>
                    <span class="pagina-info">
                        Página ${data.paginaAtual} de ${data.totalPaginas}
                    </span>
                    <button 
                        onclick="carregarTabelaEntregas(${data.paginaAtual + 1})"
                        class="btn-paginate"
                        ${data.paginaAtual === data.totalPaginas ? 'disabled' : ''}
                    >
                        Próxima <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            `;
            
            paginationContainer.innerHTML = paginationHTML;
        } else {
            document.querySelector('.pagination-container')?.remove();
        }
        
    } catch (error) {
        console.error('Erro ao carregar entregas:', error);
        document.getElementById('tabelaEntregasBody').innerHTML = 
            '<tr><td colspan="8" class="loading-text">Erro ao carregar entregas</td></tr>';
    }
}

function validateString(str) {
    // You can customize this validation as needed
    return str.length >= 3; // Example: requires at least 3 characters
}

async function handleSubmit(event) {
    event.preventDefault();

    const telefone = document.getElementById('telefone').value;
    const endereco = document.getElementById('endereco').value; // Changed from cep to endereco

    // Validate the string input
    if (!validateString(endereco)) {
        alert('O endereço deve ter pelo menos 3 caracteres');
        return;
    }

    try {
        // Obter localização atual
        const location = await getLocation();
        console.log('Localização obtida:', location);
        
        // Converter coordenadas em endereço
        const enderecoInicial = await coordenadasParaEndereco(
            location.latitude,
            location.longitude
        );
        console.log('Endereço a ser enviado:', enderecoInicial);

        // Log dos dados que serão enviados
        const dadosEnvio = {
            telefone,
            endereco, // Changed from cep to endereco
            localizacaoInicial: enderecoInicial
        };
        console.log('Dados a serem enviados:', dadosEnvio);

        // Rest of the code remains the same...
        const response = await fetch('/api/entrega', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(dadosEnvio)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let data;
        const textResponse = await response.text();
        try {
            data = JSON.parse(textResponse);
        } catch (e) {
            console.error('Erro ao fazer parse da resposta:', textResponse);
            throw new Error('Resposta inválida do servidor');
        }
        
        if (data.success) {
            currentEntregaId = data.objectId;
            mostrarTimer();
            iniciarTimer();
            document.getElementById('entregaForm').classList.add('hidden');
            document.getElementById('mediaCard').classList.add('hidden');
        } else {
            throw new Error(data.error || 'Erro desconhecido ao registrar entrega');
        }
    } catch (error) {
        console.error('Erro completo:', error);
        alert('Erro ao registrar entrega: ' + error.message);
    }
}


async function carregarEntregasEmAndamento() {
    try {
        const response = await fetch('/api/entregas-em-andamento');
        const data = await response.json();
        
        const container = document.getElementById('entregasEmAndamento');
        
        if (data.entregas.length === 0) {
            container.innerHTML = '<p class="no-deliveries">Não há entregas em andamento</p>';
            return;
        }
        
        const cards = data.entregas.map(entrega => {
            const iniciado = new Date(entrega.iniciado);
            const agora = new Date();
            const diff = Math.floor((agora - iniciado) / 1000 / 60); // diferença em minutos
            const horas = Math.floor(diff / 60);
            const minutos = diff % 60;
            
            return `
                <div class="entrega-card">
                    <h3 class="card-title">
                        <i class="fas fa-phone"></i>
                        ${entrega.telefone}
                    </h3>
                    <div class="card-timer">
                        <i class="fas fa-clock"></i>
                        <span>
                            ${horas}h ${minutos}m
                        </span>
                    </div>
                    <button onclick="finalizarEntrega('${entrega.id}')" class="btn-finalizar">
                        <i class="fas fa-check"></i>
                        Finalizar Entrega
                    </button>
                </div>
            `;
        }).join('');
        
        container.innerHTML = cards;
        
        // Atualiza os timers a cada minuto
        setTimeout(carregarEntregasEmAndamento, 60000);
        
    } catch (error) {
        console.error('Erro ao carregar entregas em andamento:', error);
    }
}

// Função para finalizar entrega (similar ao counter.js):
async function finalizarEntrega(entregaId) {
    try {
        if (!confirm('Deseja realmente finalizar esta entrega?')) {
            return;
        }

        const location = await getLocation();
        const enderecoFinal = await coordenadasParaEndereco(
            location.latitude,
            location.longitude
        );
        
        const response = await fetch(`/api/entrega/${entregaId}/finalizar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                localizacaoFinal: enderecoFinal
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Entrega finalizada com sucesso!');
            // Recarrega ambas as seções
            carregarEntregasEmAndamento();
            carregarTabelaEntregas(1);
            carregarMediaEntregas();
        } else {
            throw new Error('Falha ao finalizar entrega');
        }
    } catch (error) {
        console.error('Erro ao finalizar entrega:', error);
        alert('Erro ao finalizar entrega. Verifique a localização.');
    }
}


function calcularDuracao(dataInicio, dataFim) {
    const diff = dataFim - dataInicio;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    let duracao = '';
    if (hours > 0) duracao += `${hours} hora${hours > 1 ? 's' : ''} `;
    if (minutes > 0) duracao += `${minutes} minuto${minutes > 1 ? 's' : ''} `;
    if (seconds > 0) duracao += `${seconds} segundo${seconds > 1 ? 's' : ''}`;
    
    return duracao.trim();
}
