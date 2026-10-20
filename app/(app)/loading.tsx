import { Esqueleto } from "@/components/ui";

export default function Carregando() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando">
      <Esqueleto className="h-5 w-24" />
      <Esqueleto className="h-16 w-4/5" />
      <Esqueleto className="h-14" />
      <Esqueleto className="h-16" />
      <div className="flex gap-2">
        <Esqueleto className="h-12 w-32 rounded-full" />
        <Esqueleto className="h-12 w-28 rounded-full" />
        <Esqueleto className="h-12 w-32 rounded-full" />
      </div>
      <Esqueleto className="h-20" />
      <Esqueleto className="h-20" />
    </div>
  );
}
