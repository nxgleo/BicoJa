import { exigirPrestador } from "@/lib/prestador-pagina";
import { FormAnuncio } from "@/components/prestador/FormAnuncio";

export const dynamic = "force-dynamic";

export default async function NovoAnuncio() {
  const { perfil } = await exigirPrestador("/prestador/anuncios/novo");
  return <FormAnuncio categoriasDoPerfil={perfil.categorias} />;
}
