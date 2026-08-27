"use client";

import { useCallback, useEffect, useState } from "react";
import { aplicarTema, temaAtual, THEME_KEY, type Tema } from "@/lib/theme";

/**
 * Estado do tema para a UI (o botão do menu). A fonte da verdade é o documento
 * (data-theme, já definido pelo script de boot antes da hidratação); aqui só
 * espelhamos isso em estado React e oferecemos como trocar.
 */
export function useTema() {
  // Começa "light" (valor estável para servidor e primeiro render do cliente,
  // sem divergência de hidratação); o efeito abaixo sincroniza com o real assim
  // que monta. O menu nasce fechado, então essa correção não pisca na tela.
  const [tema, setTema] = useState<Tema>("light");

  // Sincroniza com a fonte da verdade (o data-theme que o script de boot já
  // gravou no <html>) — leitura de sistema externo, que é exatamente para o que
  // o useEffect serve. O setState é o espelho disso em estado React, e só pode
  // acontecer pós-mount: fazê-lo antes divergiria do HTML do servidor.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setTema(temaAtual()), []);

  const definir = useCallback((t: Tema) => {
    setTema(t);
    aplicarTema(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // localStorage indisponível (modo privado etc.): o tema ainda vale nesta
      // sessão, só não persiste. Não é motivo pra quebrar a tela.
    }
  }, []);

  const alternar = useCallback(
    () => definir(temaAtual() === "dark" ? "light" : "dark"),
    [definir],
  );

  return { tema, definir, alternar };
}
