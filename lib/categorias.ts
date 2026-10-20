import {
  Brush,
  Droplets,
  Hammer,
  Leaf,
  Lightbulb,
  Package,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type CategoriaId =
  | "consertos"
  | "eletrica"
  | "encanamento"
  | "pintura"
  | "montagem"
  | "limpeza"
  | "mudanca"
  | "jardim"
  | "outros";

export type Categoria = {
  id: CategoriaId;
  nome: string;
  icone: LucideIcon;
  /**
   * Palavras que a pessoa costuma escrever, sem acento e minúsculas.
   * Palavras com 4+ letras também valem como "começo": "pint" acha "pintar" e "pintura".
   */
  palavras: string[];
};

export const CATEGORIAS: Categoria[] = [
  {
    id: "consertos",
    nome: "Consertos",
    icone: Hammer,
    palavras: [
      "conserto", "consertar", "reparo", "reparar", "quebrado", "quebrou", "quebrada", "arrumar", "arruma",
      "porta", "janela", "fechadura", "trinco", "dobradica", "telhado", "telha", "goteira", "infiltracao",
      "piso", "azulejo", "rachadura", "reboco", "pedreiro", "marido de aluguel", "portao", "grade", "solda",
    ],
  },
  {
    id: "eletrica",
    nome: "Elétrica",
    icone: Zap,
    palavras: [
      "eletrica", "eletricista", "tomada", "interruptor", "fio", "fiacao", "curto", "disjuntor", "quadro",
      "luz", "lampada", "luminaria", "chuveiro", "queimou", "queimado", "queimada", "energia", "choque",
      "ventilador", "instalacao", "resistencia", "tensao", "voltagem",
    ],
  },
  {
    id: "encanamento",
    nome: "Encanamento",
    icone: Droplets,
    palavras: [
      "encanador", "encanamento", "cano", "pia", "torneira", "vazamento", "vazando", "vaza", "pingando",
      "goteja", "descarga", "privada", "vaso", "registro", "caixa dagua", "agua", "esgoto", "entupido",
      "entupiu", "entupimento", "ralo", "sifao", "hidraulica", "bomba", "cisterna",
    ],
  },
  {
    id: "pintura",
    nome: "Pintura",
    icone: Brush,
    palavras: [
      "pintura", "pintor", "pintar", "pint", "tinta", "parede", "muro", "fachada", "textura", "grafiato",
      "massa corrida", "verniz", "envernizar", "selador", "mofo", "descascando",
    ],
  },
  {
    id: "montagem",
    nome: "Montagem",
    icone: Wrench,
    palavras: [
      "montar", "montagem", "montador", "desmontar", "movel", "moveis", "armario", "guarda", "roupa",
      "estante", "prateleira", "suporte", "tv", "televisao", "cama", "berco", "rack", "painel", "cortina",
      "persiana", "furar", "furadeira", "pendurar", "quadro de parede",
    ],
  },
  {
    id: "limpeza",
    nome: "Limpeza",
    icone: Sparkles,
    palavras: [
      "limpeza", "limpar", "faxina", "faxineira", "diarista", "obra", "lavar", "lavagem", "sofa", "estofado",
      "tapete", "vidro", "janelas", "passar roupa", "organizar", "organizacao", "sujeira",
    ],
  },
  {
    id: "mudanca",
    nome: "Mudança",
    icone: Package,
    palavras: [
      "mudanca", "mudar", "frete", "carreto", "carregar", "transporte", "transportar", "levar", "caminhao",
      "carga", "entulho", "descarte", "caixas", "ajudante",
    ],
  },
  {
    id: "jardim",
    nome: "Jardim",
    icone: Leaf,
    palavras: [
      "jardim", "jardineiro", "jardinagem", "grama", "gramado", "rocar", "rocagem", "capinar", "capina",
      "mato", "poda", "podar", "arvore", "planta", "plantas", "quintal", "terreno", "folhas",
    ],
  },
  {
    id: "outros",
    nome: "Outros",
    icone: Lightbulb,
    palavras: ["outro", "outros", "ajuda", "servico", "bico", "diversos"],
  },
];
