# Contexto do Frontend da Mostra

## Objetivo da home

`index.html` deve apresentar a Amostra de Profissões da FANS, facilitar o cadastro de interesse e ajudar a pessoa visitante a encontrar cursos. Manter a identidade visual já usada no site: azul FANS, logo, imagens e estilo dos cards. Evitar substituir a página inteira por outro layout.

Ordem principal da página:

1. Imagem principal com uma chamada curta para a Amostra.
2. Bloco de inscrição imediatamente abaixo da imagem, apontando para `inscricao.html`.
3. Lista de profissões/cursos com informação resumida e links para os detalhes existentes.

Manter a informação inicial curta. Os detalhes de cada curso ficam nas páginas em `graduacao/`, `tecnicos/` e `pos/`.

## Header e arquivos-base

- `components/header.html` é o header compartilhado das páginas que carregam `js/main.js`. Não alterar esse componente ao ajustar a home.
- A home `index.html` possui seu próprio markup de header; mudanças nela não devem ser copiadas automaticamente para o componente compartilhado.
- `base` é um template de página de curso, não uma pasta nem o header compartilhado. Não editar esse arquivo para mudanças exclusivas da home.
- Na home da Mostra, a faixa de acessos institucionais (Mentor, WebGiz e semelhantes) deve permanecer comentada/oculta.
- Não mostrar link de Relações Internacionais na navegação da home.

## Inscrição e API

- Usar o formulário existente em `inscricao.html` e sua integração em `js/subscription.js`; não duplicar o formulário na home.
- `GET /api/courses` fornece os cursos válidos e `POST /api/subscriptions` registra o interesse.
- Os campos aceitos estão definidos em `docs/api-spec.md` e no formulário atual. CPF, protocolo, reserva de vaga e controle de vagas não fazem parte do contrato.
- Não inventar data, horário, vagas disponíveis ou programação da Amostra. Só publicar esses dados quando forem confirmados pela organização.
- Não incluir credenciais do banco no frontend; `.env` é configuração local do backend.

## Desenvolvimento local

- Iniciar a API na raiz do projeto com `npm run dev`.
- Servir os arquivos pelo Live Server em `http://localhost:5500` ou `http://127.0.0.1:5500`.
- Não testar a integração abrindo HTML por `file://`, pois o CORS não aceita essa origem.