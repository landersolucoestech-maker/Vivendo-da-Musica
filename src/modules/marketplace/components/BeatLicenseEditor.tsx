import { FormEvent, useEffect, useRef, useState } from 'react';
import { Download, Eye, FileText, Loader2, Settings2, Trash2, Upload } from 'lucide-react';

import { beatLicenseContractService } from '@/modules/marketplace/services/beat-license-contract.service';
import { beatService } from '@/modules/marketplace/services/beat.service';
import type { BeatLicense, BeatLicenseContract } from '@/modules/marketplace/types/product';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPrice } from '@/shared/utils/formatters';

const lines = (value: FormDataEntryValue | null): string[] => String(value ?? '')
  .split('\n')
  .map((item) => item.trim())
  .filter(Boolean);

const formatBytes = (value: number): string => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value: string): string => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value));

type LicenseDialogMode = 'view' | 'edit' | null;

const BeatLicenseEditor = ({ beatId, license, onChanged }: { beatId: string; license: BeatLicense; onChanged: () => void }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogMode, setDialogMode] = useState<LicenseDialogMode>(null);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(license.available);
  const [contract, setContract] = useState<BeatLicenseContract | null>(license.contract ?? null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const [contractBusy, setContractBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const open = dialogMode !== null;

  useEffect(() => {
    setAvailable(license.available);
    setContract(license.contract ?? null);
  }, [license.available, license.contract]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingContract(true);
    void beatLicenseContractService.getContract(beatId, license.id)
      .then((currentContract) => {
        if (active) setContract(currentContract);
      })
      .catch((error) => {
        if (active) {
          toast({
            variant: 'destructive',
            title: 'Contrato indisponível',
            description: error instanceof Error ? error.message : 'Não foi possível consultar o contrato.',
          });
        }
      })
      .finally(() => {
        if (active) setLoadingContract(false);
      });
    return () => {
      active = false;
    };
  }, [beatId, license.id, open, toast]);

  const closeDialog = () => {
    if (saving || contractBusy) return;
    setDialogMode(null);
    setContractFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const priceCents = Math.round(Number(data.get('price')) * 100);
    const maxCopiesValue = String(data.get('maxCopies') ?? '').trim();
    setSaving(true);
    try {
      await beatService.updateBeatLicense(beatId, license.id, {
        name: String(data.get('name')).trim(),
        priceCents,
        ...(maxCopiesValue ? { maxCopies: Number(maxCopiesValue) } : {}),
        usageRights: lines(data.get('usageRights')),
        deliverables: lines(data.get('deliverables')),
        available,
      });
      onChanged();
      setDialogMode(null);
      toast({ title: 'Licença atualizada' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao editar licença',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadContract = async () => {
    if (!contractFile) {
      toast({
        variant: 'destructive',
        title: 'Selecione o contrato',
        description: 'Envie um arquivo PDF, DOC ou DOCX de até 20 MB.',
      });
      return;
    }

    setContractBusy(true);
    try {
      const uploaded = await beatLicenseContractService.uploadContract(beatId, license.id, contractFile);
      setContract(uploaded);
      setContractFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onChanged();
      toast({
        title: contract ? 'Contrato substituído' : 'Contrato enviado',
        description: uploaded.fileName,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha no upload do contrato',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally {
      setContractBusy(false);
    }
  };

  const downloadContract = async () => {
    setContractBusy(true);
    try {
      const url = await beatLicenseContractService.getDownloadUrl(beatId, license.id);
      window.location.assign(url);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao baixar contrato',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally {
      setContractBusy(false);
    }
  };

  const removeContract = async () => {
    setContractBusy(true);
    try {
      await beatLicenseContractService.removeContract(beatId, license.id);
      setContract(null);
      setConfirmRemove(false);
      onChanged();
      toast({ title: 'Contrato removido da licença' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao remover contrato',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally {
      setContractBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 rounded-lg border border-white/8 bg-white/[0.02] p-2">
        <div className="mr-auto min-w-0 px-1 py-1">
          <p className="truncate text-xs font-semibold text-white">{license.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatPrice(license.priceCents, license.currency)} · {license.available ? 'disponível' : 'indisponível'}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setDialogMode('view')}>
          <Eye className="size-3.5" />
          Visualizar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDialogMode('edit')}>
          <Settings2 className="size-3.5" />
          Editar
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {dialogMode === 'view' ? (
            <>
              <DialogHeader>
                <DialogTitle>Visualizar licença</DialogTitle>
                <DialogDescription>Condições comerciais, direitos, entregáveis e contrato vinculado.</DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div><p className="text-xs text-muted-foreground">Nome</p><p className="mt-1 font-semibold text-white">{license.name}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tipo</p><p className="mt-1 text-white">{license.type}</p></div>
                  <div><p className="text-xs text-muted-foreground">Preço</p><p className="mt-1 font-semibold text-primary">{formatPrice(license.priceCents, license.currency)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Disponibilidade</p><p className="mt-1 text-white">{license.available ? 'Disponível para compra' : 'Indisponível'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Exclusividade</p><p className="mt-1 text-white">{license.isExclusive ? 'Licença exclusiva' : 'Licença não exclusiva'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Limite de cópias</p><p className="mt-1 text-white">{license.maxCopies?.toLocaleString('pt-BR') ?? 'Sem limite definido'}</p></div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <section>
                    <h3 className="text-sm font-semibold text-white">Direitos de uso</h3>
                    {license.usageRights.length ? (
                      <ul className="mt-3 list-inside list-disc space-y-1 text-sm leading-6 text-muted-foreground">
                        {license.usageRights.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : <p className="mt-2 text-sm text-muted-foreground">Nenhum direito informado.</p>}
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold text-white">Entregáveis</h3>
                    {license.deliverables.length ? (
                      <ul className="mt-3 list-inside list-disc space-y-1 text-sm leading-6 text-muted-foreground">
                        {license.deliverables.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : <p className="mt-2 text-sm text-muted-foreground">Nenhum entregável informado.</p>}
                  </section>
                </div>

                <section className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><FileText className="size-5" /></span>
                    <div>
                      <h3 className="text-base font-semibold text-white">Contrato de licenciamento</h3>
                      {loadingContract ? (
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Consultando contrato...</p>
                      ) : contract ? (
                        <>
                          <p className="mt-1 break-all text-sm text-white">{contract.fileName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatBytes(contract.sizeBytes)} · atualizado em {formatDate(contract.updatedAt)}</p>
                        </>
                      ) : (
                        <p className="mt-1 text-xs leading-5 text-amber-200">Nenhum arquivo enviado. O comprador recebe o PDF automático de contingência.</p>
                      )}
                    </div>
                  </div>
                  {contract && (
                    <Button className="mt-4" type="button" size="sm" variant="outline" disabled={contractBusy} onClick={() => void downloadContract()}>
                      {contractBusy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      Baixar contrato atual
                    </Button>
                  )}
                </section>

                <div className="rounded-xl border border-white/10 p-4 text-xs text-muted-foreground">
                  ID da licença: <span className="break-all font-mono text-white">{license.id}</span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Fechar</Button>
                <Button onClick={() => setDialogMode('edit')}><Settings2 className="size-4" />Editar licença</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Editar licença</DialogTitle>
                <DialogDescription>Configure valores, direitos, entregáveis e o contrato de licenciamento vinculado.</DialogDescription>
              </DialogHeader>

              <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor={`license-name-${license.id}`}>Nome</Label><Input id={`license-name-${license.id}`} name="name" defaultValue={license.name} required maxLength={80} /></div>
                <div className="space-y-2"><Label htmlFor={`license-price-${license.id}`}>Preço (R$)</Label><Input id={`license-price-${license.id}`} name="price" type="number" min={0} step="0.01" defaultValue={(license.priceCents / 100).toFixed(2)} required /></div>
                <div className="space-y-2"><Label htmlFor={`license-copies-${license.id}`}>Limite de cópias</Label><Input id={`license-copies-${license.id}`} name="maxCopies" type="number" min={1} defaultValue={license.maxCopies ?? ''} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor={`license-rights-${license.id}`}>Direitos — um por linha</Label><Textarea id={`license-rights-${license.id}`} name="usageRights" rows={5} defaultValue={license.usageRights.join('\n')} required /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor={`license-files-${license.id}`}>Entregáveis — um por linha</Label><Textarea id={`license-files-${license.id}`} name="deliverables" rows={5} defaultValue={license.deliverables.join('\n')} required /></div>
                <div className="flex items-center gap-2 sm:col-span-2"><Checkbox id={`license-available-${license.id}`} checked={available} onCheckedChange={(value) => setAvailable(value === true)} /><Label htmlFor={`license-available-${license.id}`}>Disponível para novas compras</Label></div>
                <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" disabled={saving} onClick={closeDialog}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button></div>
              </form>

              <section className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><FileText className="size-5" /></span>
                  <div><h3 className="text-base font-semibold text-white">Contrato de licenciamento</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Envie o contrato específico desta licença. O comprador receberá esse documento no botão “Baixar contrato”.</p></div>
                </div>

                {loadingContract ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Consultando contrato atual...</div>
                ) : contract ? (
                  <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <p className="break-all text-sm font-medium text-white">{contract.fileName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatBytes(contract.sizeBytes)} · atualizado em {formatDate(contract.updatedAt)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" disabled={contractBusy} onClick={() => void downloadContract()}>{contractBusy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Baixar atual</Button>
                      <Button type="button" size="sm" variant="destructive" disabled={contractBusy} onClick={() => setConfirmRemove(true)}><Trash2 className="size-4" />Remover</Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-200">Nenhum contrato foi enviado. Enquanto isso, a plataforma usa somente o PDF automático de contingência.</p>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor={`license-contract-${license.id}`}>{contract ? 'Substituir contrato' : 'Enviar contrato'} — PDF, DOC ou DOCX, até 20 MB</Label>
                    <Input ref={fileInputRef} id={`license-contract-${license.id}`} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setContractFile(event.target.files?.[0] ?? null)} />
                  </div>
                  <Button type="button" disabled={!contractFile || contractBusy} onClick={() => void uploadContract()}>{contractBusy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{contract ? 'Substituir' : 'Enviar contrato'}</Button>
                </div>
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contrato da licença?</AlertDialogTitle>
            <AlertDialogDescription>O arquivo será excluído do armazenamento privado. Novos downloads voltarão a usar o PDF automático de contingência.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={contractBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={contractBusy} onClick={(event) => { event.preventDefault(); void removeContract(); }}>{contractBusy ? 'Removendo...' : 'Remover contrato'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BeatLicenseEditor;
