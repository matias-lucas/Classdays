"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NOME_CURSO } from "@/lib/config";

/**
 * Porta de entrada do admin. Envia a senha, o servidor confere e devolve o
 * cookie de sessão (httpOnly — o JS daqui nunca vê o valor). Com o cookie
 * no lugar, o router.refresh() re-renderiza /admin já autenticado.
 */
export function LoginAdmin() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (r.ok) {
        router.refresh();
        return; // mantém "entrando…" até a página re-renderizar logada
      }
      const corpo = await r.json().catch(() => null);
      setErro(corpo?.erro ?? "Não deu certo — tente de novo.");
      setEnviando(false);
    } catch {
      setErro("Sem conexão com o servidor.");
      setEnviando(false);
    }
  }

  return (
    <div className="login-wrap">
      <p className="eyebrow">Classdays · {NOME_CURSO}</p>
      <form className="login-card" onSubmit={entrar}>
        <div>
          <h1>Admin</h1>
          <p className="head-sub">área da representação de turma</p>
        </div>
        <label className="campo">
          <span>Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
            minLength={6}
          />
        </label>
        {erro && <p className="msg-erro">{erro}</p>}
        <button type="submit" className="btn btn-primario" disabled={enviando || senha.length < 6}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <Link className="login-voltar" href="/">
        ← voltar à agenda
      </Link>
    </div>
  );
}
