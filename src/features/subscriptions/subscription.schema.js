const { z } = require('zod');

const PROFISSOES = [
  // Graduacoes
  'Administração',
  'Direito',
  'Ciências Contábeis',
  'Engenharia de Software',
  'Pedagogia',
  'Psicologia',
  // Tecnicos
  'Técnico em Enfermagem',
  'Técnico em Segurança do Trabalho',
];

// DDDs validos da ANATEL.
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

const onlyDigits = (value) => (typeof value === 'string' ? value.replace(/\D/g, '') : '');

// Fixo: DDD + 8 digitos (inicia em 2-5). Celular: DDD + 9 + 8 digitos.
function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  if (!DDDS.has(Number(phone.slice(0, 2)))) return false;
  if (phone.length === 11) return phone[2] === '9';
  if (phone.length === 10) return /[2-5]/.test(phone[2]);
  return false;
}

const subscriptionSchema = z.object({
  nome: z
    .string({ required_error: 'Nome e obrigatorio', invalid_type_error: 'Nome e obrigatorio' })
    .transform((value) => value.trim().replace(/\s+/g, ' '))
    .pipe(
      z
        .string()
        .min(3, 'Nome deve ter no minimo 3 caracteres')
        .max(150, 'Nome deve ter no maximo 150 caracteres')
        .regex(/^[\p{L}' -]+$/u, 'Nome deve conter apenas letras')
        .refine((value) => value.includes(' '), 'Informe o nome completo'),
    ),

  email: z
    .string({ required_error: 'E-mail e obrigatorio', invalid_type_error: 'E-mail e obrigatorio' })
    .trim()
    .toLowerCase()
    .pipe(z.string().email('E-mail invalido').max(320, 'E-mail muito longo')),

  telefone: z
    .string({ required_error: 'Telefone e obrigatorio', invalid_type_error: 'Telefone e obrigatorio' })
    .regex(/^[\d\s()-]+$/, 'Telefone deve conter apenas numeros, espacos, parenteses ou hifen')
    .transform(onlyDigits)
    .refine(isValidPhone, 'Telefone invalido: informe DDD valido + numero (10 ou 11 digitos)'),

  profissao_interesse: z.enum(PROFISSOES, {
    errorMap: () => ({ message: `Profissao invalida. Opcoes: ${PROFISSOES.join(', ')}` }),
  }),

  // Campos complementares opcionais (conforme modelagem e contrato de banco)
  idade: z
    .union([
      z.number({ invalid_type_error: 'Idade deve ser um número' }).int().min(1).max(120),
      z.string().regex(/^\d+$/).transform(Number),
    ])
    .optional(),
  curso: z.string().optional(),
  novo: z.string().max(100).nullable().optional(),
  outro: z.string().max(100).nullable().optional(),
  novidade: z.union([z.number(), z.boolean()]).transform((v) => (v ? 1 : 0)).optional(),
  feedback: z.string().nullable().optional(),
  saber: z.string().nullable().optional(),
});

module.exports = { subscriptionSchema, PROFISSOES, isValidPhone };
