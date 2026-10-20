export function BarraProgresso({ passo, total }: { passo: number; total: number }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-texto-suave">
        Passo {passo} de {total}
      </p>
      <div
        role="progressbar"
        aria-label="Progresso do cadastro"
        aria-valuemin={1}
        aria-valuenow={passo}
        aria-valuemax={total}
        className="h-2 overflow-hidden rounded-full bg-superficie-suave"
      >
        <div
          className="h-full rounded-full bg-marca transition-[width] duration-300 ease-out"
          style={{ width: `${(passo / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
