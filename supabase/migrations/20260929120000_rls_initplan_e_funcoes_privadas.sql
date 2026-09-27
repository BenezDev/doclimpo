-- Desempenho e superfície das regras de acesso (achados do Security/Performance
-- Advisor do Supabase em 27/09/2026). Nada muda para o usuário: as regras
-- continuam as mesmas, só ficam mais baratas e menos expostas.
--
-- 1) auth.uid() dentro de (select ...): o Postgres calcula uma vez por consulta,
--    em vez de uma vez por linha (lint 0003_auth_rls_initplan).
-- 2) familia_membro_de/familia_titular_de saem do schema public: como são
--    SECURITY DEFINER e recebem qualquer uid, qualquer pessoa logada podia
--    chamá-las por /rest/v1/rpc. As políticas guardam a função pelo OID, então
--    continuam funcionando; o schema private não é exposto pela API.
-- 3) Índices nas chaves estrangeiras de renovacoes e referrals (tabelas legadas
--    limpas pelo delete-account).

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.familia_membro_de(uuid) set schema private;
alter function public.familia_titular_de(uuid) set schema private;

-- profiles (casa com o auth por user_id)
alter policy "Users can view their own profile" on public.profiles using ((select auth.uid()) = user_id);
alter policy "Users can insert their own profile" on public.profiles with check ((select auth.uid()) = user_id);
alter policy "Users can update their own profile" on public.profiles using ((select auth.uid()) = user_id);

-- documentos
alter policy "Users can view their own documents" on public.documentos using ((select auth.uid()) = usuario_id);
alter policy "Users can create their own documents" on public.documentos with check ((select auth.uid()) = usuario_id);
alter policy "Users can update their own documents" on public.documentos using ((select auth.uid()) = usuario_id);
alter policy "Users can delete their own documents" on public.documentos using ((select auth.uid()) = usuario_id);

-- alertas_configuracao (legada)
alter policy "Users can view their own alert configs" on public.alertas_configuracao using ((select auth.uid()) = usuario_id);
alter policy "Users can create their own alert configs" on public.alertas_configuracao with check ((select auth.uid()) = usuario_id);
alter policy "Users can update their own alert configs" on public.alertas_configuracao using ((select auth.uid()) = usuario_id);
alter policy "Users can delete their own alert configs" on public.alertas_configuracao using ((select auth.uid()) = usuario_id);

-- referral_codes e referrals (legadas)
alter policy "Users can view their own referral code" on public.referral_codes using ((select auth.uid()) = user_id);
alter policy "Users can view referrals they made" on public.referrals using ((select auth.uid()) = referrer_id);

-- renovacoes (legada)
alter policy "Users can view their own renewals" on public.renovacoes using ((select auth.uid()) = usuario_id);
alter policy "Users can create their own renewals" on public.renovacoes with check ((select auth.uid()) = usuario_id);
alter policy "Users can update their own renewals" on public.renovacoes using ((select auth.uid()) = usuario_id);
alter policy "Users can delete their own renewals" on public.renovacoes using ((select auth.uid()) = usuario_id);

-- notifications
alter policy "Users can view their own notifications" on public.notifications using ((select auth.uid()) = usuario_id);
alter policy "Users can create their own notifications" on public.notifications with check ((select auth.uid()) = usuario_id);
alter policy "Users can update their own notifications" on public.notifications using ((select auth.uid()) = usuario_id);
alter policy "Users can delete their own notifications" on public.notifications using ((select auth.uid()) = usuario_id);

-- payments e subscriptions (só leitura para o usuário)
alter policy "Users can view their own payments" on public.payments using ((select auth.uid()) = usuario_id);
alter policy "Users can view their own subscriptions" on public.subscriptions using ((select auth.uid()) = usuario_id);

-- família
alter policy "familia visivel ao titular e membros" on public.familias
  using ((titular_id = (select auth.uid())) or (id = private.familia_membro_de((select auth.uid()))));
alter policy "membros visiveis ao titular e ao proprio" on public.familia_membros
  using ((user_id = (select auth.uid())) or (familia_id = private.familia_titular_de((select auth.uid()))));
alter policy "titular remove membro e membro sai" on public.familia_membros
  using ((user_id = (select auth.uid())) or (familia_id = private.familia_titular_de((select auth.uid()))));

-- push_subscriptions
alter policy "push: ver as proprias" on public.push_subscriptions using ((select auth.uid()) = usuario_id);
alter policy "push: criar as proprias" on public.push_subscriptions with check ((select auth.uid()) = usuario_id);
alter policy "push: atualizar as proprias" on public.push_subscriptions using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
alter policy "push: remover as proprias" on public.push_subscriptions using ((select auth.uid()) = usuario_id);

-- veiculos
alter policy "veiculos: ver os proprios" on public.veiculos using ((select auth.uid()) = usuario_id);
alter policy "veiculos: criar os proprios" on public.veiculos with check ((select auth.uid()) = usuario_id);
alter policy "veiculos: atualizar os proprios" on public.veiculos using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
alter policy "veiculos: remover os proprios" on public.veiculos using ((select auth.uid()) = usuario_id);

create index if not exists idx_renovacoes_documento on public.renovacoes (documento_id);
create index if not exists idx_renovacoes_usuario on public.renovacoes (usuario_id);
create index if not exists idx_referrals_referrer on public.referrals (referrer_id);
