# 🌿 Wiki Condomínio Jardim do Ypê - Aplicação Web

Aplicação web dinâmica desenvolvida para consulta pública, moderna e intuitiva da **Convenção de Condomínio**, do **Regulamento Interno** e do **FAQ (Perguntas Frequentes)** do Condomínio Jardim do Ypê.

---

## 👤 Informações de Autoria e Desenvolvimento

* **Desenvolvedor:** Lúcio Fázio
* **E-mail de Contato:** [lukfazio@gmail.com](mailto:lukfazio@gmail.com)
* **Data de Criação:** 13 de Novembro de 2026
* **Repositório Oficial:** [lukfazio.github.io-CondominioJardimYpe](https://github.com/lukfazio/lukfazio.github.io-CondominioJardimYpe)

---

## ⚖️ Aviso Legal, Domínio e Isenção de Responsabilidade

1. **Titularidade e Domínio do Condomínio:**  
   Todas as informações, deliberações, cláusulas, artigos e regras constantes nesta aplicação são de **exclusiva propriedade e domínio do Condomínio Jardim do Ypê** (São Paulo - SP), constituído sob o regime da Lei Federal nº 4.591/1964 e do Código Civil Brasileiro.

2. **Caráter Meramente Informativo:**  
   Esta ferramenta foi criada de forma voluntária e comunitária para facilitar a consulta rápida por parte de moradores, proprietários e inquilinos. A ferramenta reproduz fielmente as minutas e regulamentos aprovados em assembleias. Para quaisquer efeitos judiciais, extrajudiciais solenes ou comprovações formais de direitos e deveres, **prevalecem integralmente as certidões e vias originais arquivadas junto à Administração do Condomínio e aos Cartórios de Registro competentes**.

3. **Competência Exclusiva:**  
   Quaisquer alterações de normas, valores de cotas ou penalidades dependem de quórum legal e deliberação soberana das Assembleias Gerais de Condôminos e do Corpo Diretivo (Síndico e Conselho).

---

## 🚀 Destaques da Aplicação

* **Consumo Dinâmico dos Arquivos `.md`:** A página lê os arquivos Markdown na pasta `data/` diretamente via `fetch()`. Qualquer alteração realizada nos arquivos reflete automaticamente na página web.
* **Busca Global Instantânea (Ctrl + K):** Pesquisa rápida e inteligente com tolerância a acentuação em todos os documentos e FAQ simultaneamente, exibindo trechos com destaque (`<mark>`) e salto direto para a cláusula correspondente.
* **Índice Temático (Guia Rápido por Assuntos):** Painel visual com atalhos diretos para os temas mais procurados pelos moradores (Silêncio, Vagas de Garagem, Mudanças, Obras, Animais/Pets, Salão de Festas, Piscina, Multas, etc.).
* **FAQ Interativo:** Área de perguntas frequentes com respostas diretas e links clicáveis para as cláusulas da documentação oficial.
* **Sumário Dinâmico (TOC):** Barra lateral que extrai automaticamente os capítulos e seções do documento em leitura.
* **Recursos de Conforto e Acessibilidade:**
  * Modo Escuro (Dark Mode) e Modo Claro.
  * Ajuste de tamanho de texto (A- / A / A+).
  * Botões de copiar link direto da seção (🔗) para compartilhamento ágil no WhatsApp.
  * Formatação otimizada para impressão física ou geração de PDF limpo.

---

## 📁 Estrutura de Arquivos da Aplicação

```
App/
├── index.html                           # Interface visual principal
├── styles.css                           # Estilos responsivos e temas
├── app.js                               # Motor JavaScript (leitura .md, busca, TOC e roteamento)
├── docs-cache.js                        # Cache de contingência para abertura offline (file://)
├── README.md                            # Documentação técnica e aviso legal
└── data/                                # Documentos Markdown oficiais da aplicação
    ├── convencao_jardim_do_ype.md       # Texto integral da Convenção Condominial
    ├── regulamento_interno_jardim_do_ype.md # Texto integral do Regulamento Interno
    └── faq.md                           # Perguntas Frequentes (FAQ) dos moradores
```

---

## ✏️ Como Atualizar o Conteúdo dos Documentos

Para editar regras ou acrescentar perguntas ao FAQ, basta alterar os arquivos na pasta `data/`:
* **Convenção:** `data/convencao_jardim_do_ype.md`
* **Regulamento:** `data/regulamento_interno_jardim_do_ype.md`
* **FAQ:** `data/faq.md`

Ao salvar e enviar as alterações para o repositório, a aplicação atualizará o conteúdo automaticamente ao recarregar a página.

---

## 💻 Como Abrir e Testar Localmente

Basta dar um **duplo clique no arquivo `index.html`** para abri-lo em qualquer navegador moderno (Chrome, Edge, Firefox, Safari).

---

*Condomínio Jardim do Ypê — Rua Sérgio Martins Blumer Bastos, nº 50 - Horto do Ypê, São Paulo (SP).*
