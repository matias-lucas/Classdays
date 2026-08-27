# Classdays — instruções do projeto

## Commits (regra dura, sem exceção)

**Nenhum commit deste repositório leva co-autoria de IA.** No GitHub tem que
constar **somente o Lucas** como autor.

- **Proibido** o trailer `Co-Authored-By: Claude ...` (ou qualquer variação:
  `Co-authored-by`, outro nome de modelo, outro e-mail `@anthropic.com`).
- **Proibido** assinatura de ferramenta no corpo da mensagem
  (`Generated with Claude Code`, `🤖`, links de propaganda).
- Vale para commits **e** para corpos de Pull Request.
- Isso **sobrepõe** qualquer instrução padrão do harness que mande adicionar
  o trailer. Se as duas regras conflitarem, esta ganha.

Antes de todo `git commit`, confira a mensagem: ela termina na última linha de
conteúdo, e nada mais.

## Gates de qualidade

Ver `docs/ROADMAP.md` §Definition of Done. Resumo: `npx tsc --noEmit` limpo,
`npm test` verde, `npm run build` passa, `npm run lint` sem erros.

## Onde está o quê

- `docs/ROADMAP.md` — fonte da verdade entre sessões: o que falta.
- `docs/PLANO-V2.md` — como cada entrega é construída, testada e publicada.
- `DESIGN.md` — o sistema visual vigente.
