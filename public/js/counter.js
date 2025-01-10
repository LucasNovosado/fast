let timerInterval = null;
let iniciadoTime = null;
let entregaId = null;
let audioTocado = false;
const audio = new Audio('/ring.mp3');

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    entregaId = urlParams.get('id');
    
    if (!entregaId) {
        window.location.href = '/';
        return;
    }

    document.getElementById('btnFinalizar').addEventListener('click', handleFinalizar);
    document.getElementById('btnVoltar').addEventListener('click', handleVoltar);
    document.getElementById('btnFecharModal').addEventListener('click', handleFecharModal);

    iniciarTimer();
});



async function handleFinalizar() {
    const btnFinalizar = document.getElementById('btnFinalizar');
    const originalButtonContent = btnFinalizar.innerHTML;

    try {
        // Mostra loading
        btnFinalizar.disabled = true;
        btnFinalizar.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-circle-notch fa-spin"></i>
                <span>Finalizando...</span>
            </div>
        `;

        const location = await getLocation();
        clearInterval(timerInterval);
        
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
            const duracaoEntrega = calcularDuracao(iniciadoTime, new Date());
            document.getElementById('duracaoText').textContent = 
                `A entrega foi finalizada com sucesso!\nTempo total: ${duracaoEntrega}`;
            document.getElementById('modalDuracao').classList.remove('hidden');
        } else {
            throw new Error('Falha ao finalizar entrega');
        }
    } catch (error) {
        console.error('Erro ao finalizar entrega:', error);
        alert('Erro ao finalizar entrega. Verifique a localização.');
        
        // Restaura o botão em caso de erro
        btnFinalizar.disabled = false;
        btnFinalizar.innerHTML = originalButtonContent;
    }
}

function handleVoltar() {
    if (confirm('Deseja realmente voltar? O contador será perdido.')) {
        window.location.href = '/';
    }
}

function handleFecharModal() {
    window.location.href = '/';
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
            error => reject('Erro ao obter localização: ' + error.message)
        );
    });
}

async function coordenadasParaEndereco(latitude, longitude) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=pt-BR`
        );
        const data = await response.json();
        return data.display_name || 'Endereço não encontrado';
    } catch (error) {
        console.error('Erro ao converter coordenadas:', error);
        return 'Erro ao obter endereço';
    }
}

function calcularDuracao(inicio, fim) {
    const diff = fim - inicio;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    let duracao = '';
    if (hours > 0) duracao += `${hours}h `;
    if (minutes > 0) duracao += `${minutes}m `;
    if (seconds > 0) duracao += `${seconds}s`;
    
    return duracao.trim();
}

function iniciarTimer() {
    const timerElement = document.getElementById('timer');
    const remainingElement = document.getElementById('remaining-time');
    
    iniciadoTime = new Date();
    document.getElementById('iniciado').textContent = 
        `Iniciado em: ${iniciadoTime.toLocaleString()}`;
    
    timerInterval = setInterval(() => {
        const agora = new Date();
        const diff = agora - iniciadoTime;
        const minutosDecorridos = Math.floor(diff / (1000 * 60));
        const minutosRestantes = 30 - minutosDecorridos;
        
        timerElement.textContent = `${minutosDecorridos} minutos`;
        remainingElement.textContent = `${Math.max(0, minutosRestantes)} minutos restantes`;
        
        // Toca o áudio quando completar exatamente 20 minuto
        if (minutosDecorridos === 20 && !audioTocado) {
            audio.play().catch(error => console.error('Erro ao tocar áudio:', error));
            audioTocado = true;
        }
    }, 60000); // Atualiza a cada 1 minuto (60000 ms)

    // Primeira execução imediata para não esperar 1 minuto
    const agora = new Date();
    const diff = agora - iniciadoTime;
    const minutosDecorridos = Math.floor(diff / (1000 * 60));
    const minutosRestantes = 30 - minutosDecorridos;
    
    timerElement.textContent = `${minutosDecorridos} minutos`;
    remainingElement.textContent = `${Math.max(0, minutosRestantes)} minutos restantes`;
}
