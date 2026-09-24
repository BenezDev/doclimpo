# E-mails do Supabase Auth

Modelos com a marca do DocLimpo para os e-mails que o próprio Supabase envia.
O projeto hospedado não lê estes arquivos: cole cada um no painel, em
Authentication → Emails → Templates, com o assunto abaixo. Mantenha estes
arquivos iguais ao que estiver no painel.

| Arquivo | Modelo no painel | Assunto |
|---|---|---|
| `confirmacao.html` | Confirm signup | Confirme seu e-mail no DocLimpo |
| `recuperacao.html` | Reset password | Redefina sua senha do DocLimpo |
| `troca-email.html` | Change email address | Confirme seu novo e-mail no DocLimpo |

Os e-mails só saem para qualquer endereço com o SMTP próprio configurado
(Authentication → Emails → SMTP Settings): host `smtp.resend.com`, porta 465,
usuário `resend`, senha = uma chave da Resend, remetente
`DocLimpo <alertas@doclimpo.com>`. Sem isso, o SMTP padrão do Supabase só
entrega para a equipe do projeto.
