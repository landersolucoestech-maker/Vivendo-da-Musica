import { FormEvent, useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";
import { marketplaceService } from "@/modules/marketplace/services/marketplace.service";
import type { BeatLicense } from "@/modules/marketplace/types/product";
import { formatPrice } from "@/shared/utils/formatters";

const lines = (value: FormDataEntryValue | null): string[] =>
  String(value ?? "").split("\n").map((item) => item.trim()).filter(Boolean);

const BeatLicenseEditor = ({ beatId, license, onChanged }: { beatId: string; license: BeatLicense; onChanged: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(license.available);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const priceCents = Math.round(Number(data.get("price")) * 100);
    const maxCopiesValue = String(data.get("maxCopies") ?? "").trim();
    setSaving(true);
    try {
      await marketplaceService.updateBeatLicense(beatId, license.id, {
        name: String(data.get("name")),
        priceCents,
        ...(maxCopiesValue ? { maxCopies: Number(maxCopiesValue) } : {}),
        usageRights: lines(data.get("usageRights")),
        deliverables: lines(data.get("deliverables")),
        available,
      });
      setOpen(false);
      onChanged();
      toast({ title: "Licenca atualizada" });
    } catch (error) {
      toast({ variant: "destructive", title: "Falha ao editar licenca", description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Settings2 className="mr-1 h-3.5 w-3.5" />{license.name}: {formatPrice(license.priceCents, license.currency)}{license.available ? "" : " (indisponivel)"}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Editar licenca</DialogTitle><DialogDescription>{license.type} · valores persistidos no Supabase.</DialogDescription></DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor={`license-name-${license.id}`}>Nome</Label><Input id={`license-name-${license.id}`} name="name" defaultValue={license.name} required maxLength={80} /></div>
          <div className="space-y-2"><Label htmlFor={`license-price-${license.id}`}>Preco (R$)</Label><Input id={`license-price-${license.id}`} name="price" type="number" min={0} step="0.01" defaultValue={(license.priceCents / 100).toFixed(2)} required /></div>
          <div className="space-y-2"><Label htmlFor={`license-copies-${license.id}`}>Limite de copias</Label><Input id={`license-copies-${license.id}`} name="maxCopies" type="number" min={1} defaultValue={license.maxCopies ?? ""} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor={`license-rights-${license.id}`}>Direitos (um por linha)</Label><Textarea id={`license-rights-${license.id}`} name="usageRights" rows={5} defaultValue={license.usageRights.join("\n")} required /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor={`license-files-${license.id}`}>Entregaveis (um por linha)</Label><Textarea id={`license-files-${license.id}`} name="deliverables" rows={5} defaultValue={license.deliverables.join("\n")} required /></div>
          <div className="flex items-center gap-2 sm:col-span-2"><Checkbox id={`license-available-${license.id}`} checked={available} onCheckedChange={(value) => setAvailable(value === true)} /><Label htmlFor={`license-available-${license.id}`}>Disponivel para novas compras</Label></div>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar licenca"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BeatLicenseEditor;
