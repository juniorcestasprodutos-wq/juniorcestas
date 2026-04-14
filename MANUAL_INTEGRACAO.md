# Manual de Integração: Junior Cestas e Produto + Mercado Pago + N8N

Este guia explica como configurar o sistema para gerar cobranças PIX automaticamente e enviar notificações via WhatsApp.

## 1. Mercado Pago e InfinityPay (Tokens)

O sistema suporta Mercado Pago (PF e PJ) e InfinityPay (PJ) para dividir o faturamento.

### Configuração no Sistema:
1. No menu lateral, acesse **Configurações**.
2. **Mercado Pago:** Insira os tokens PF e PJ.
3. **InfinityPay:** Ative a opção e insira o Bearer Token.
4. **Modo de Distribuição:**
   - **Apenas Mercado Pago:** Usa PJ até o limite, depois PF.
   - **Apenas InfinityPay:** Direciona tudo para InfinityPay.
   - **Híbrido:** Usa PJ até o limite, depois tenta InfinityPay (se ativo), e por fim PF.

---

## 2. N8N (Automação de WhatsApp e Lembretes Diários)

O sistema envia um "webhook" para o N8N sempre que um PIX é gerado, seja manualmente ou via automação.

### Lembretes Automáticos:
- **Vencimento Hoje:** O sistema identifica parcelas que vencem hoje e gera o PIX.
- **Atrasados (Diário):** Se a parcela vencer e continuar pendente, o sistema continuará enviando o PIX todos os dias até atingir o limite de **Dias para Reatribuição**.
- **Validade do PIX:** O PIX gerado tem validade configurável (ex: 5 dias). Após esse prazo, o código expira.

### Configuração do Webhook no N8N:
1. No N8N, use o nó **Webhook** (POST).
2. No sistema, cole a URL em **Configurações**.
3. O payload incluirá o campo `provider` (`MERCADO_PAGO` ou `INFINITY`) para que você saiba qual API gerou o código.

---

## 3. Automação de Cobradores

- **Reatribuição:** Se uma parcela ficar vencida por mais de **X dias**, a venda é designada automaticamente para o próximo cobrador ativo.
- **Rodízio:** O sistema garante que as cobranças difíceis sejam rotacionadas entre a equipe.

