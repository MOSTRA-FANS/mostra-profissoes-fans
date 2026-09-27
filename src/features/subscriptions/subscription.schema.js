const { z } = require('zod');
const { SABER_OPTIONS } = require('./subscription.constants');

// DDDs validos da ANATEL.
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

const onlyDigits = (value) => (typeof value === 'string' ? value.replace(/\D/g, '') : '');

function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  if (!DDDS.has(Number(phone.slice(0, 2)))) return false;
  if (phone.length === 11) return phone[2] === '9';
  if (phone.length === 10) return /[2-5]/.test(phone[2]);
  return false;
}

const courseField = z
  .string({ required_error: 'Escolha um curso atual', invalid_type_error: 'Curso deve ser uma unica opcao' })
  .trim()
  .min(1, 'Escolha um curso atual')
  .max(100, 'Curso deve ter no maximo 100 caracteres');

const nullableText = (max, message) => z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().max(max, message).nullable().optional(),
);

const subscriptionBodySchema = z
  .object({
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

    idade: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
      z
        .number({ required_error: 'Idade e obrigatoria', invalid_type_error: 'Idade deve ser um numero' })
        .int('Idade deve ser um numero inteiro')
        .min(1, 'Idade deve ser maior que zero')
        .max(120, 'Idade deve ser no maximo 120'),
    ),

    // O nome oficial e validado pelo service contra o catalogo do banco.
    curso: courseField,
    profissao_interesse: courseField.optional(),
    novo: nullableText(100, 'Curso novo deve ter no maximo 100 caracteres'),
    outro: nullableText(100, 'Outro deve ter no maximo 100 caracteres'),
    novidade: z
      .union([z.literal(0), z.literal(1), z.boolean()])
      .transform((value) => (value === true || value === 1 ? 1 : 0))
      .optional()
      .default(0),
    feedback: nullableText(5000, 'Feedback deve ter no maximo 5000 caracteres'),
    saber: z.preprocess(
      (value) => (value === '' ? null : value),
      z.enum(SABER_OPTIONS, {
        errorMap: () => ({ message: `Canal invalido. Opcoes: ${SABER_OPTIONS.join(', ')}` }),
      }).nullable().optional(),
    ),
  })
  .superRefine((data, context) => {
    if (data.curso && data.profissao_interesse && data.curso !== data.profissao_interesse) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['curso'],
        message: 'curso e profissao_interesse devem representar a mesma opcao',
      });
    }
  })
  .transform(({ profissao_interesse, ...data }) => ({
    ...data,
    curso: data.curso,
  }));

const subscriptionSchema = z.preprocess((input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  return {
    ...input,
    curso: input.curso || input.profissao_interesse,
  };
}, subscriptionBodySchema);

module.exports = { subscriptionSchema, SABER_OPTIONS, isValidPhone };
