# Plano de Ação: Sistema de Assinaturas e Cobranças

## Problema
Ao assinar um plano pago (Starter, Pro, Elite), o checkout do Mercado Pago é criado, mas:
1. O webhook do MP pode não estar sendo chamado corretamente (URL de notificação)
2. O status da assinatura fica como TRIAL em vez de ACTIVE após pagamento
3. As limitações de features não estão sendo aplicadas corretamente

## Diagnóstico

### Fluxo atual:
1. **Registro**: cria TenantSubscription com plan escolhido, status = TRIAL (se pago) ou ACTIVE (se FREE)
2. **Checkout**: cria preferência MP com `external_reference = tenantId:plan:cycle`
3. **Webhook MP**: recebe notificação, busca payment, verifica `status === 'approved'`, faz upsert da subscription com status ACTIVE
4. **SubscriptionGate**: verifica se status está EXPIRED/CANCELED/PAST_DUE → bloqueia

### Problemas identificados:

1. **Webhook não está sendo chamado**: a URL de notificação no MP pode não estar configurada corretamente ou o endpoint não está acessível
2. **Após pagamento, plano continua como TRIAL**: o webhook pode estar falhando silenciosamente (try/catch vazio)
3. **Register não cria checkout**: quando o usuário seleciona um plano pago no registro, ele cria a subscription como TRIAL mas não redireciona para pagamento
4. **Limites de features**: o `SubscriptionGate` só bloqueia se status for EXPIRED/CANCELED/PAST_DUE, mas não verifica se o plano FREE está tentando usar features pagas

## Correções necessárias

### 1. Backend - Webhook MP
- Melhorar log no webhook para debug
- Garantir que o endpoint está exposto como público
- Verificar se `notification_url` está correta

### 2. Backend - Register com plano pago
- Após criar subscription como TRIAL, criar preferência MP e retornar `checkoutUrl`
- Frontend deve redirecionar para o checkout após registro

### 3. Frontend - Register
- Se plano for pago, após registro bem-sucedido, chamar checkout e redirecionar
- Se plano for FREE, redirecionar direto para o dashboard

### 4. Backend - SubscriptionGate + PlanFeatureGuard
- Garantir que guards de feature estão sendo aplicados nos controllers
- Verificar se `checkFeature` está sendo chamado nos endpoints protegidos

### 5. Frontend - SubscriptionGate
- Melhorar para mostrar upgrade necessário quando feature não disponível
