// === FUNÇÃO PARA CARREGAR COMPONENTES (HEADER/FOOTER) ===
// Esta versão usa a lógica de tentativas, que é mais segura para subpastas
async function loadComponent(elementId, fileName) {
    const element = document.getElementById(elementId);
    if (!element) return false;

    const pathsToTry = [
        `components/${fileName}`,      
        `../components/${fileName}`,   
        `../../components/${fileName}`,
        `/components/${fileName}` // Tenta também pela raiz absoluta
    ];

    for (const path of pathsToTry) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                const html = await response.text();
                element.innerHTML = html;
                return true; 
            }
        } catch (e) { continue; }
    }
    console.error(`Não foi possível carregar: ${fileName}`);
    return false;
}

// === LÓGICA DO MENU MOBILE ===
function initMenuLogic() {
    const mobileBtn = document.getElementById('mobileMenuButton');
    const closeMobileBtn = document.getElementById('closeMobileMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (!mobileMenu || !mobileBtn) return;

    function toggleMenu(show) {
        if (show) {
            mobileMenu.classList.remove('hidden');
            setTimeout(() => mobileMenu.classList.add('active'), 10);
            document.body.style.overflow = 'hidden';
        } else {
            mobileMenu.classList.remove('active');
            setTimeout(() => mobileMenu.classList.add('hidden'), 300);
            document.body.style.overflow = '';
        }
    }

    mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(true);
    });

    if (closeMobileBtn) closeMobileBtn.addEventListener('click', () => toggleMenu(false));

    // Fecha ao clicar fora ou nos links
    document.addEventListener('click', (e) => {
        if (!mobileMenu.classList.contains('hidden') && !mobileMenu.contains(e.target) && !mobileBtn.contains(e.target)) {
            toggleMenu(false);
        }
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => toggleMenu(false));
    });
}

// === DESTAQUE DA PÁGINA ATUAL ===
function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('nav a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href.replace('../', '').replace('./', ''))) {
            link.classList.add('text-blue-400', 'font-bold');
        }
    });
}

// === BOTÃO VOLTAR AO TOPO ===
function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    if (!backToTopBtn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.remove('opacity-0', 'invisible');
            backToTopBtn.classList.add('opacity-100', 'visible');
        } else {
            backToTopBtn.classList.add('opacity-0', 'invisible');
            backToTopBtn.classList.remove('opacity-100', 'visible');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// === EXECUÇÃO ÚNICA ===
document.addEventListener('DOMContentLoaded', async function() {
    // 1. Carrega os componentes e aguarda
    const headerLoaded = await loadComponent('header-placeholder', 'header.html');
    await loadComponent('footer-placeholder', 'footer.html');

    // 2. Inicia as lógicas (Menu só se o header existir)
    if (headerLoaded) {
        initMenuLogic();
        highlightCurrentPage();
    }
    
    initBackToTop();

    // 3. Sistema de Abas Global
    window.openTab = function(evt, tabName) {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'bg-blue-600', 'text-white'));
        
        const activeTab = document.getElementById(tabName);
        if (activeTab) activeTab.classList.remove('hidden');
        if (evt) evt.currentTarget.classList.add('active', 'bg-blue-600', 'text-white');
    };
});
// === FUNÇÃO PARA CORRIGIR CAMINHOS DOS LINKS ===
function adjustLinks() {
    // Verifica quantos níveis de pasta estamos (ex: /graduacao/direito.html tem 1 nível)
    const pathArray = window.location.pathname.split('/').filter(p => p !== '');
    
    // Se estivermos em uma subpasta (graduacao, pos, tecnicos), precisamos subir 1 nível
    // Ajuste essa lógica se você tiver pastas mais profundas
    const isSubfolder = pathArray.some(folder => ['graduacao', 'pos', 'tecnicos'].includes(folder));
    const prefix = isSubfolder ? '../' : '';

    const links = document.querySelectorAll('header a, #mobileMenu a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        // Não altera links externos ou âncoras
        if (href && !href.startsWith('http') && !href.startsWith('#')) {
            // Remove ../ pré-existentes para evitar duplicidade e aplica o prefixo correto
            const cleanHref = href.replace('../', '');
            link.setAttribute('href', prefix + cleanHref);
        }
    });
}

// === NO SEU DOMContentLoaded, CHAME A FUNÇÃO ===
document.addEventListener('DOMContentLoaded', async function() {
    const headerLoaded = await loadComponent('header-placeholder', 'header.html');
    await loadComponent('footer-placeholder', 'footer.html');

    if (headerLoaded) {
        adjustLinks(); // <--- Adicione isso aqui!
        initMenuLogic();
        highlightCurrentPage();
    }
    // ... restante do código
});