import { z } from 'zod'

// Espelho, no cliente, das regras que o banco impõe (ver migration
// 20260911120000_seguranca_constraints.sql). O banco é a autoridade; isto é
// UX + defesa em profundidade. Lógica pura, testável com node:test.

export const TIPOS_DOCUMENTO = [
  'cnh', 'crlv', 'ipva', 'passaporte', 'rg', 'seguro', 'plano_saude', 'carteira_trabalho',
  'garantia', 'contrato', 'exame',
  'alvara', 'certidao', 'das_mei', 'outro',
] as const

// Tipos que só fazem sentido para a empresa (plano MEI).
export const TIPOS_EMPRESARIAIS = ['alvara', 'certidao', 'das_mei'] as const

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]

export const conviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(254),
})

export const planoSchema = z.enum(['individual', 'familia', 'mei'])

export const telefoneSchema = z.object({
  numero: z.string().trim().min(8, 'Informe o celular com DDD.').max(25, 'Número muito longo.'),
})

export const codigoSchema = z.object({
  codigo: z.string().trim().regex(/^\d{6}$/, 'O código tem 6 dígitos.'),
})

// Dados auxiliares de IPVA/CRLV para sugerir o próximo prazo na renovação.
export const extraSchema = z.object({
  uf: z.string().length(2),
  placa_final: z.enum(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']),
}).strict()

export const documentoSchema = z.object({
  tipo: z.enum(TIPOS_DOCUMENTO),
  apelido: z.string().trim().max(80, 'Apelido muito longo (máx. 80 caracteres).').optional(),
  data_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.'),
  extra: extraSchema.optional(),
})

export const renovacaoSchema = z.object({
  nova_data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.'),
})

export const enderecoSchema = z.object({
  cep: z.string().trim().max(9).optional(),
  logradouro: z.string().trim().max(120, 'Logradouro muito longo.').optional(),
  numero: z.string().trim().max(20).optional(),
  complemento: z.string().trim().max(60).optional(),
  bairro: z.string().trim().max(80).optional(),
  cidade: z.string().trim().min(1, 'Informe a cidade.').max(80, 'Cidade muito longa.'),
  uf: z.string().trim().length(2, 'UF deve ter 2 letras.'),
})

export type DocumentoInput = z.infer<typeof documentoSchema>
export type EnderecoInput = z.infer<typeof enderecoSchema>
