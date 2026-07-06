# Guia de Publicação na Play Store — FitlyNutri TWA

> Documento completo para submeter o TWA (Trusted Web Activity) na Google Play Store.

---

## 📦 Artefatos Gerados

| Artefato | Caminho | Tamanho |
|---|---|---|
| APK Release | `apps/twa/android/app/build/outputs/apk/release/app-release.apk` | ~868 KB |
| AAB Release | `apps/twa/android/app/build/outputs/bundle/release/app-release.aab` | ~828 KB |
| Ícone Play Store | `apps/twa/android/app/src/main/playstore-icon.png` | 512x512 px |

> **Recomendado:** Use o **AAB** (Android App Bundle) para publicação na Play Store.

---

## ✅ Checklist Pré-Publicação

### 1. Verificar assetlinks.json
```bash
curl https://fitlynutri.com.br/.well-known/assetlinks.json
```
Deve retornar:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.fitlynutri.app",
    "sha256_cert_fingerprints": [
      "88:6F:7A:63:4E:02:D4:BB:88:05:2B:3C:51:C0:68:41:BD:D2:CC:22:1D:E5:CC:8B:D9:40:99:01:14:CA:F8:65"
    ]
  }
}]
```

### 2. Verificar assinatura do APK/AAB
```bash
# Verificar se o APK está assinado com o keystore correto
cd apps/twa/android
keytool -list -v -keystore app/release.keystore -alias release -storepass android
```
O SHA-256 deve ser: `88:6F:7A:63:4E:02:D4:BB:88:05:2B:3C:51:C0:68:41:BD:D2:CC:22:1D:E5:CC:8B:D9:40:99:01:14:CA:F8:65`

### 3. Verificar package name
O `applicationId` no `build.gradle` deve ser: `com.fitlynutri.app`

### 4. Testar o APK no celular
1. Desinstalar versão anterior do FitlyNutri
2. Instalar o APK: `apps/twa/android/app/build/outputs/apk/release/app-release.apk`
3. Abrir o app
4. Verificar se a **barra de URL desapareceu** (pode levar até 24h para o navegador verificar o assetlinks)
5. Se a barra ainda aparecer:
   - Abrir Brave/Chrome > Configurações > Apps de verificação digital > FitlyNutri
   - Ou limpar dados do navegador e reinstalar o APK

### 5. Navegador: Brave (recomendado) com fallback para Chrome
O TWA agora prioriza o **Brave Browser**. Comportamento:
- ✅ **Brave instalado** → abre direto no Brave sem barra de URL
- ✅ **Apenas Chrome** → abre no Chrome (fallback automático)
- ⚠️ **Nenhum dos dois** → mostra diálogo com botão "Instalar Brave" na Play Store

---

## 🚀 Submissão na Play Store

### Passo 1: Criar conta Google Play Developer
- Acesse: https://play.google.com/console/
- Taxa única: **$25 USD**
- Use a conta Google do desenvolvedor

### Passo 2: Criar novo app
1. Clique em **"Create app"**
2. Escolha:
   - **Name:** FitlyNutri
   - **Default language:** Português (Brasil)
   - **App or game:** App
   - **Free or paid:** Free
3. Clique em **"Create app"**

### Passo 3: Preencher listing da loja
#### Descrição do app (sugestão):
```
**Título:** FitlyNutri - Gestão de Treinos e Dietas

**Descrição curta:**
Gerencie seus alunos, treinos e dietas em um só lugar.

**Descrição completa:**
FitlyNutri é a plataforma completa para personal trainers e nutricionistas gerenciarem seus alunos de forma eficiente.

Com o FitlyNutri você pode:
• Gerenciar alunos e seus progressos
• Criar treinos personalizados com exercícios em vídeo
• Montar dietas e planos alimentares
• Acompanhar evolução com fotos e medidas
• Agendar consultas e avaliações
• Chat integrado com alunos
• Dashboard com métricas e relatórios

Tudo isso diretamente do seu navegador, com a experiência de um app nativo.
```

#### Categorias:
- **Category:** Health & Fitness
- **Tags:** Fitness, Personal Trainer, Nutrição, Saúde
- **Email de contato:** (coloque seu email)

#### Gráficos:
| Asset | Tamanho | Localização |
|---|---|---|
| Ícone | 512x512 px | `apps/twa/android/app/src/main/playstore-icon.png` |
| Feature Graphic | 1024x500 px | Criar (ver seção abaixo) |
| Screenshots (2-8) | 1080x1920 ou 1080x2160 | Capturar do site no celular |

### Passo 4: Feature Graphic (obrigatório)
Crie uma imagem 1024x500 px com o nome "FitlyNutri" e o logo. Pode usar:
- Canva (https://canva.com)
- Photoshop
- Ou peça para um designer

Sugestão: Fundo roxo escuro (#09090b) com o texto "FitlyNutri" em branco e o logo roxo (#7c3aed).

### Passo 5: Screenshots
Tire screenshots do site https://fitlynutri.com.br no celular:
1. Tela de login
2. Dashboard
3. Lista de alunos
4. Tela de treino
5. Tela de dieta
6. Chat

Dimensões recomendadas: **1080 x 1920 px** (retrato)

### Passo 6: Classificação etária
1. Preencha o questionário de classificação
2. Provavelmente será: **"Everyone"** ou **"Everyone 10+"** (app de saúde/fitness)

### Passo 7: Política de privacidade
Crie uma URL com a política de privacidade. Sugestão:
- Hospedar em: `https://fitlynutri.com.br/privacy-policy`
- Ou usar um gerador online

### Passo 8: App releases
1. Vá em **"Production"** > **"Create new release"**
2. Faça upload do **AAB**: `app-release.aab`
3. Preencha as release notes:
```
Versão 1.0.0
- Primeiro lançamento do FitlyNutri
- Gestão completa de alunos, treinos e dietas
- Interface responsiva e otimizada
```
4. Revise e publique

---

## 🔄 Atualizações Futuras

Para publicar uma nova versão:
1. Faça as alterações necessárias no site
2. Incremente `versionCode` e `versionName` no `apps/twa/android/app/build.gradle`
3. Execute:
```bash
cd apps/twa/android
./gradlew bundleRelease
```
4. Upload do novo AAB na Play Console

---

## ⚠️ Problemas Comuns

### Barra de URL não desaparece
- O Chrome leva até 24h para verificar o `assetlinks.json`
- Forçar verificação:
  1. Desinstalar o APK
  2. Ir em Configurações > Apps > Chrome > Armazenamento > Limpar dados
  3. Reinstalar o APK
  4. Abrir o app

### App não abre (tela branca)
- Verificar se o site https://fitlynutri.com.br está online
- Verificar se o SSL está válido

### Google rejeita o app
- Verificar se a política de privacidade está acessível
- Verificar se o app não requer login obrigatório para a tela inicial
- Garantir que o `assetlinks.json` está acessível via HTTPS

---

## 📋 Comandos Rápidos

```bash
# Build APK
cd apps/twa/android && ./gradlew assembleRelease

# Build AAB (recomendado Play Store)
cd apps/twa/android && ./gradlew bundleRelease

# Verificar assetlinks
curl https://fitlynutri.com.br/.well-known/assetlinks.json

# Verificar assinatura do keystore
keytool -list -v -keystore apps/twa/android/app/release.keystore -alias release -storepass android

# Verificar se APK está assinado
cd apps/twa/android/app/build/outputs/apk/release
keytool -printcert -jarfile app-release.apk
```

---

*Documento gerado em: 04/07/2026*
