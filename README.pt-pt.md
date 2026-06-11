[![English](https://img.shields.io/badge/lang-en-green)](README.md) [![Português do Brasil](https://img.shields.io/badge/lang-pt--BR-green)](README.pt-br.md) ![Português](https://img.shields.io/badge/lang-pt-blue)

# Suporte a Templates Django/Jinja para VS Code

Uma extensão do Visual Studio Code que fornece realce de sintaxe e suporte a formatação para ficheiros de template Django e Jinja2.

## Funcionalidades

### Realce de Sintaxe

- Realce completo de sintaxe para tags de template Django/Jinja (`{% %}`, `{{ }}`, `{# #}`)
- Realce baseado em injeção que funciona em ficheiros HTML, JavaScript, TypeScript e XML
- Realce automático em ficheiros dentro de pastas `templates` ou `template`

### Envolvimento Inteligente com Comentários para TypeScript/JavaScript

- Envolve automaticamente tags de template Django com comentários `/* */` ao abrir ficheiros TS/JS
- Remove os envolvimentos de comentário ao guardar (para que o ficheiro seja guardado limpo)
- Marcadores de comentário (`/*` e `*/`) são renderizados quase invisíveis (15% de opacidade, espaçamento condensado)
- Preserva as funcionalidades do TypeScript/JavaScript enquanto esconde erros de sintaxe das tags de template

### Formatação

- Alimentado pelo Prettier para formatação consistente de código
- Preserva tags de template Django/Jinja durante a formatação
- Suporta ficheiros HTML, JavaScript, TypeScript e XML em pastas de template
- Deteta automaticamente projetos Python (procura por `manage.py`, `pyproject.toml`, `setup.py`, `requirements.txt` ou `Pipfile`)

## Linguagens Suportadas

| Tipo de Ficheiro           | Extensão                                         | ID da Linguagem |
| -------------------------- | ------------------------------------------------ | --------------- |
| Django/Jinja HTML          | `.djhtml`, `.django`, `.jinja`, `.jinja2`, `.j2` | `django-html`   |
| HTML com tags Django       | `.html` (em pastas de template)                  | `html`          |
| JavaScript com tags Django | `.js` (em pastas de template)                    | `javascript`    |
| TypeScript com tags Django | `.ts` (em pastas de template)                    | `typescript`    |
| XML com tags Django        | `.xml` (em pastas de template)                   | `xml`           |

## Comandos

| Comando                                                | Descrição                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `Django Template: Set as Django/Jinja HTML`            | Define a linguagem do ficheiro atual como Django HTML        |
| `Django Template: Wrap Django tags with /* */`         | Envolve manualmente tags Django com marcadores de comentário |
| `Django Template: Unwrap Django tags (remove /* */)`   | Remove manualmente os envolvimentos de comentário            |
| `Django Template: Toggle auto wrap/unwrap Django tags` | Ativa/desativa o envolvimento automático                     |

## Configuração

| Configuração                                       | Tipo    | Padrão                      | Descrição                                                                                         |
| -------------------------------------------------- | ------- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| `djangoTemplateExtension.enableFormatting`         | boolean | `true`                      | Ativa formatação para ficheiros em pastas de template                                             |
| `djangoTemplateExtension.templateFolderNames`      | array   | `["templates", "template"]` | Nomes de pastas a serem reconhecidas como pastas de template                                      |
| `djangoTemplateExtension.autoDetectPythonProject`  | boolean | `true`                      | Ativa formatação apenas quando dentro de um projeto Python                                        |
| `djangoTemplateExtension.wrapDjangoTagsInComments` | boolean | `true`                      | Envolve automaticamente tags Django com `/* */` ao abrir e remove ao guardar para ficheiros TS/JS |

## Instalação

### Do VS Code Marketplace

1. Abra o VS Code
2. Vá para Extensões (Ctrl+Shift+X)
3. Pesquise por "Django Jinja Template Support"
4. Clique em Instalar

### De VSIX

1. Descarregue o ficheiro `.vsix` da página de releases
2. Abra o VS Code
3. Vá para Extensões (Ctrl+Shift+X)
4. Clique no menu `...` e selecione "Install from VSIX..."
5. Selecione o ficheiro descarregado

## Uso

### Templates HTML

Ficheiros com extensões `.djhtml`, `.django`, `.jinja`, `.jinja2` ou `.j2` são automaticamente reconhecidos como templates Django HTML. Para ficheiros `.html` regulares em pastas de template, use o comando "Set as Django/Jinja HTML" ou a opção do menu de contexto.

### Templates TypeScript/JavaScript

Quando abre um ficheiro TypeScript ou JavaScript contendo tags de template Django:

1. A extensão automaticamente envolve as tags de template com comentários `/* */`
2. Os marcadores `/*` e `*/` são visualmente ocultados
3. Quando guarda, os envolvimentos de comentário são removidos
4. Após guardar, eles são reaplicados para continuar a edição

### Formatação

Use o comando padrão de formatação do VS Code (Shift+Alt+F) para formatar os seus ficheiros de template. A extensão preservará as tags de template Django/Jinja enquanto formata o código ao redor.

## Limitações Conhecidas

- **Estado de Documento Modificado**: Ao abrir ficheiros TS/JS com tags Django, o documento será marcado como modificado devido ao envolvimento automático. Esta é uma limitação da API do VS Code.
- **Visibilidade dos Marcadores**: Os marcadores de comentário `/* */` são renderizados quase invisíveis (15% de opacidade, espaçamento condensado) mas ainda podem ser vistos em inspeção detalhada e selecionados com navegação por teclado.

## Contribuir

Contribuições são bem-vindas! Sinta-se à vontade para enviar um Pull Request.

## Licença

Licença MIT - veja o ficheiro [LICENSE](LICENSE) para detalhes.
