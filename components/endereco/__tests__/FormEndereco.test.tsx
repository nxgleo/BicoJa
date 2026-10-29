import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormEndereco } from "@/components/endereco/FormEndereco";

test("campos com rótulo e cidade Belém já preenchida", () => {
  render(<FormEndereco textoBotao="Salvar endereço" onSalvo={() => {}} />);
  for (const rotulo of ["Rua", "Número", "Complemento (opcional)", "Bairro", "Cidade"]) {
    expect(screen.getByLabelText(rotulo)).toBeInTheDocument();
  }
  expect(screen.getByLabelText("Cidade")).toHaveValue("Belém");
  expect(screen.getByRole("button", { name: "Salvar endereço" })).toBeInTheDocument();
});
