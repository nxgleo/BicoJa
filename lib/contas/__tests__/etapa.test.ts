import { describe, expect, test } from "vitest";
import { caminhoSeguro, destinoParaPagina, deveEncerrarSessao, etapaDoCadastro } from "@/lib/contas/etapa";

const semEmail = { emailVerificado: false, temFoto: false };
const semFoto = { emailVerificado: true, temFoto: false };
const completo = { emailVerificado: true, temFoto: true };

describe("etapaDoCadastro", () => {
  test("ordem: código, completo", () => {
    expect(etapaDoCadastro(semEmail)).toBe("codigo");
    expect(etapaDoCadastro(semFoto)).toBe("completo"); // foto é opcional
    expect(etapaDoCadastro(completo)).toBe("completo");
  });
});

describe("destinoParaPagina", () => {
  test("sem login, páginas da conta pedem para entrar e lembram a volta", () => {
    expect(destinoParaPagina("/perfil", null)).toBe("/entrar?voltar=%2Fperfil");
    expect(destinoParaPagina("/conversas/123", null)).toBe("/entrar?voltar=%2Fconversas%2F123");
  });

  test("cadastro incompleto vai para o passo que falta", () => {
    expect(destinoParaPagina("/conversas", semEmail)).toBe("/cadastro/codigo");
    expect(destinoParaPagina("/perfil", semFoto)).toBeNull(); // sem foto também entra
  });

  test("cadastro completo entra normalmente", () => {
    expect(destinoParaPagina("/perfil", completo)).toBeNull();
  });

  test("início e busca são livres", () => {
    expect(destinoParaPagina("/", null)).toBeNull();
    expect(destinoParaPagina("/buscar", null)).toBeNull();
    expect(destinoParaPagina("/servicos/abc", null)).toBeNull();
  });

  test("logado e completo não precisa de entrar nem de cadastro", () => {
    expect(destinoParaPagina("/entrar", completo)).toBe("/");
    expect(destinoParaPagina("/cadastro", completo)).toBe("/");
  });

  test("telas do cadastro levam ao passo certo", () => {
    expect(destinoParaPagina("/cadastro/codigo", semFoto)).toBe("/cadastro/pronto");
    expect(destinoParaPagina("/cadastro/foto", completo)).toBeNull(); // trocar/pôr foto depois
    expect(destinoParaPagina("/cadastro/foto", semEmail)).toBe("/cadastro/codigo");
    expect(destinoParaPagina("/cadastro/codigo", null)).toBe("/entrar?voltar=%2Fcadastro%2Fcodigo");
    expect(destinoParaPagina("/cadastro/codigo", semEmail)).toBeNull();
  });

  test("entrar e cadastro sempre abrem do começo se o cadastro está pela metade", () => {
    expect(destinoParaPagina("/entrar", semEmail)).toBeNull();
    expect(destinoParaPagina("/entrar", semFoto)).toBe("/");
    expect(destinoParaPagina("/cadastro", semEmail)).toBeNull();
    expect(destinoParaPagina("/cadastro/codigo", semEmail)).toBeNull();
  });
});

describe("deveEncerrarSessao", () => {
  test("saiu do cadastro antes do código: encerra (volta pela tela de entrar)", () => {
    expect(deveEncerrarSessao("/", semEmail)).toBe(true);
    expect(deveEncerrarSessao("/entrar", semEmail)).toBe(true);
    expect(deveEncerrarSessao("/cadastro", semEmail)).toBe(true);
    expect(deveEncerrarSessao("/perfil", semEmail)).toBe(true);
  });

  test("continua nos passos do cadastro ou com o email confirmado", () => {
    expect(deveEncerrarSessao("/cadastro/codigo", semEmail)).toBe(false);
    expect(deveEncerrarSessao("/cadastro/foto", semEmail)).toBe(false);
    expect(deveEncerrarSessao("/", semFoto)).toBe(false);
    expect(deveEncerrarSessao("/", completo)).toBe(false);
    expect(deveEncerrarSessao("/", null)).toBe(false);
  });
});

describe("caminhoSeguro", () => {
  test("só aceita caminhos do próprio site", () => {
    expect(caminhoSeguro("/perfil")).toBe("/perfil");
    expect(caminhoSeguro("//evil.com")).toBe("/");
    expect(caminhoSeguro("https://evil.com")).toBe("/");
    expect(caminhoSeguro("/\\evil.com")).toBe("/");
    expect(caminhoSeguro(null)).toBe("/");
    // Tabulação/quebra de linha são apagadas pelo navegador: "/\t/evil.com" vira "//evil.com"
    expect(caminhoSeguro("/\t/evil.com")).toBe("/");
    expect(caminhoSeguro("/\n/evil.com")).toBe("/");
    expect(caminhoSeguro("/perfil?aba=dados")).toBe("/perfil?aba=dados");
  });
});
