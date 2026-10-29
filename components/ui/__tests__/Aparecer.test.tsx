import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { Aparecer } from "@/components/ui/Aparecer";

test("o conteúdo já vem visível do servidor (a animação é só CSS)", () => {
  const html = renderToString(<Aparecer>Olá</Aparecer>);
  expect(html).toContain("Olá");
  expect(html).not.toContain("opacity:0");
  expect(html).toContain("animate-aparecer");
});
