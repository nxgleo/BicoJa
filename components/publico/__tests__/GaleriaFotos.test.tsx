import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { GaleriaFotos } from "@/components/publico/GaleriaFotos";

test("cada foto tem descrição para leitor de tela", () => {
  render(<GaleriaFotos fotos={["/a.webp", "/b.webp"]} titulo="Conserto" />);
  expect(screen.getByAltText("Foto 1 de Conserto")).toBeInTheDocument();
  expect(screen.getByAltText("Foto 2 de Conserto")).toBeInTheDocument();
});

test("sem fotos não mostra nada", () => {
  const { container } = render(<GaleriaFotos fotos={[]} titulo="Conserto" />);
  expect(container).toBeEmptyDOMElement();
});
