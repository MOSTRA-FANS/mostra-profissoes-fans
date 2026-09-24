const { z } = require('zod');

// TODO: confirmar a lista oficial de profissoes com a equipe/banco de dados.
const PROFISSOES = [
  'Administracao',
  'Direito',
  'Enfermagem',
  'Engenharia de Software',
  'Pedagogia',
  'Psicologia',
];

// DDDs validos da ANATEL.
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

const onlyDigits = (value) => value.replace(/\D/g, '');

function isValidCpf(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const checkDigit = (length) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === Number(cpf[9]) && checkDigit(10) === Number(cpf[10]);
}

// Fixo: DDD + 8 digitos (inicia em 2-5). Celular: DDD + 9 + 8 digitos.
function isValidPhone(phone) {
  if (!DDDS.has(Number(phone.slice(0, 2)))) return false;
  if (phone.length === 11) return phone[2] === '9';
  if (phone.length === 10) return /[2-5]/.test(phone[2]);
  return false;
}

const subscriptionSchema = z.object({
  nome: z
    .string({ error: 'Nome e obrigatorio' })
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
    .string({ error: 'E-mail e obrigatorio' })
    .trim()
    .toLowerCase()
    .pipe(z.email('E-mail invalido').max(320, 'E-mail muito longo')),

  cpf: z
    .string({ error: 'CPF e obrigatorio' })
    .regex(/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/, 'CPF deve ter o formato 00000000000 ou 000.000.000-00')
    .transform(onlyDigits)
    .refine(isValidCpf, 'CPF invalido'),

  telefone: z
    .string({ error: 'Telefone e obrigatorio' })
    .regex(/^[\d\s()-]+$/, 'Telefone deve conter apenas numeros, espacos, parenteses ou hifen')
    .transform(onlyDigits)
    .refine(isValidPhone, 'Telefone invalido: informe DDD valido + numero (10 ou 11 digitos)'),

  profissao_interesse: z.enum(PROFISSOES, {
    error: `Profissao invalida. Opcoes: ${PROFISSOES.join(', ')}`,
  }),
});

module.exports = { subscriptionSchema, PROFISSOES, isValidCpf, isValidPhone };
