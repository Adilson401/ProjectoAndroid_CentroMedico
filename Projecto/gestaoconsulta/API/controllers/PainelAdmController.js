import { PainelAdmService } from '../services/painelAdmService.js';

export class PainelAdmController {
  constructor(prisma) {
    this.painelAdmService = new PainelAdmService(prisma);
  }

  // Manda o resumo que aparece no painel do administrador.
  async obterResumo(req, res) {
    try {
      const resumo = await this.painelAdmService.obterResumo();
      return res.json(resumo);
    } catch (error) {
      console.error('Erro ao obter painel administrativo:', error);
      return res.status(500).json({ error: 'Erro ao obter painel administrativo.' });
    }
  }
}
