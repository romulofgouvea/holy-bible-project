# Local Build and Deploy Pipeline (Android)

A pipeline local de build e deploy para o Android (Google Play Store), sem dependência do EAS.

---

## Arquivos necessários (não versionados)

Estes arquivos devem existir localmente:

| Arquivo | Descrição |
|---|---|
| `keystore.jks` | Keystore do app na Play Store |
| `credentials.md` | Senhas e alias do keystore |
| `google-service-key.json` | Chave da conta de serviço do Google Play |

> Para obter o `keystore.jks` e `credentials.md`, baixe via `eas credentials` ou recupere do EAS Console.

---

## Formato do `credentials.md`

```
Android upload keystore password: <senha do keystore>
Android key alias: <alias da chave>
Android key password: <senha da chave>
```

---

## Formato do `google-service-key.json`

Arquivo JSON da conta de serviço do Google Cloud com permissão de **Google Play Android Developer API**.
Obtido em: Google Cloud Console → IAM → Contas de serviço → Chaves.

---

## Comandos disponíveis

### Build

```bash
npm run local:build:preview
```

- Mostra a versão atual e pergunta se deseja alterar
- Incrementa o `versionCode` automaticamente (se o último deploy foi concluído)
- Roda `expo prebuild --clean`
- Compila o `.aab` com a keystore correta via Gradle
- Valida a assinatura do AAB gerado
- Salva o `.aab` em `local-builds/outputs/`

### Deploy

```bash
npm run local:deploy:preview     # → track: internal
npm run local:deploy:production  # → track: production ⚠️
```

- Pega o `.aab` mais recente de `local-builds/outputs/`
- Faz upload para o Google Play via API oficial
- Exibe barra de progresso do upload
- Marca `deploy-state.json` como `deployed: true` ao concluir

### Build + Deploy (fluxo completo)

```bash
npm run local:submit:preview
```

Equivale a `build` seguido de `deploy:preview` em sequência.
Se o build falhar, o deploy **não é executado**.


## Lógica de versionamento

### `version` (string exibida na loja)
Exibida durante o build — o usuário digita o novo valor ou pressiona Enter para manter.

### `versionCode` (inteiro obrigatório pela Play Store)
Gerenciado automaticamente via `deploy-state.json`, Após um deploy bem-sucedido, o arquivo volta para `{ "deployed": true }` automaticamente.

**Isso garante que:**
- Builds com falha não consomem `versionCode`
- O mesmo `.aab` pode ser reenviado sem recompilar se apenas o deploy falhar

---

## Arquivos do pipeline

| Arquivo | Função |
|---|---|
| `build.mjs` | Script principal de build |
| `deploy.mjs` | Script de deploy para o Google Play |
| `google-play-deploy.js` | Upload via Google Play Developer API (Node.js) |
| `outputs/` | AABs gerados (ignorados pelo git) |

---

## Pré-requisitos

- Node.js + npm
- Java JDK (para Gradle e keytool)
- Android SDK / Android Studio
- Windows ou Linux. Ao trocar de sistema na mesma pasta, rode `npm ci`: o `node_modules` tem binarios nativos de cada plataforma
- `expo-cli` instalado globalmente ou via `npx`
