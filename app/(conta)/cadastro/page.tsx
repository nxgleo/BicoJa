import { FormCadastro } from "@/components/conta/FormCadastro";
import { confirmarEmailLigado } from "@/lib/contas/config";

// A chave CONFIRMAR_EMAIL só existe no servidor, então a tela recebe a resposta pronta
export default function Cadastro() {
  return <FormCadastro confirmarEmail={confirmarEmailLigado()} />;
}
