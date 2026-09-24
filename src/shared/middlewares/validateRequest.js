// Valida req.body contra um schema Zod. Em caso de sucesso, substitui o body
// pelos dados sanitizados; em caso de falha, responde 400 com as inconsistencias.
const validateRequest = (schema) => (req, res, next) => {
  const data = req.body ?? {};
  if (data && typeof data === 'object' && !data.profissao_interesse && data.curso) {
    data.profissao_interesse = data.curso;
  }

  const result = schema.safeParse(data);

  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: 'Dados invalidos',
      errors: result.error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensagem: issue.message,
      })),
    });
  }

  req.body = result.data;
  return next();
};

module.exports = validateRequest;
