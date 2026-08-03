import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, BriefcaseBusiness, Loader2, Save, SlidersHorizontal } from 'lucide-react';

import {
  adminCommercialService,
  type AdminBeatLicenseTemplate,
  type AdminJobCreditPack,
  type CommercialParameter,
} from '@/modules/admin/services/adminCommercial.service';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const parameterValueToInput = (parameter: CommercialParameter) => {
  if (parameter.valueType === 'json') return JSON.stringify(parameter.value, null, 2);
  return String(parameter.value ?? '');
};

const parameterUnit = (parameter: CommercialParameter) => {
  if (parameter.valueType === 'percentage_bps') return 'pontos-base';
  if (parameter.valueType === 'money') return 'centavos';
  if (parameter.key.endsWith('_days')) return 'dias';
  return parameter.valueType;
};

const lineArray = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

const CommercialConfigurationPanel = () => {
  const { toast } = useToast();
  const [parameters, setParameters] = useState<CommercialParameter[]>([]);
  const [packs, setPacks] = useState<AdminJobCreditPack[]>([]);
  const [templates, setTemplates] = useState<AdminBeatLicenseTemplate[]>([]);
  const [parameterDrafts, setParameterDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedParameters, loadedPacks, loadedTemplates] = await Promise.all([
        adminCommercialService.listParameters(),
        adminCommercialService.listJobCreditPacks(),
        adminCommercialService.listBeatLicenseTemplates(),
      ]);
      setParameters(loadedParameters);
      setPacks(loadedPacks);
      setTemplates(loadedTemplates);
      setParameterDrafts(Object.fromEntries(
        loadedParameters.map((parameter) => [parameter.id, parameterValueToInput(parameter)]),
      ));
    } catch (error) {
      toast({
        title: 'Configurações comerciais não carregadas',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const parameterGroups = useMemo(() => {
    const groups = new Map<string, CommercialParameter[]>();
    parameters.forEach((parameter) => {
      groups.set(parameter.category, [...(groups.get(parameter.category) ?? []), parameter]);
    });
    return [...groups.entries()];
  }, [parameters]);

  const saveParameter = async (parameter: CommercialParameter) => {
    setSavingKey(`parameter-${parameter.id}`);
    try {
      const raw = parameterDrafts[parameter.id] ?? '';
      const value = adminCommercialService.parseInputValue(parameter, raw);
      await adminCommercialService.publishParameter(parameter, value);
      await load();
      toast({
        title: 'Nova versão comercial publicada',
        description: `${parameter.label} foi atualizada sem necessidade de deploy.`,
      });
    } catch (error) {
      toast({
        title: 'Parâmetro não atualizado',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const updatePack = (id: string, patch: Partial<AdminJobCreditPack>) => {
    setPacks((current) => current.map((pack) => pack.id === id ? { ...pack, ...patch } : pack));
  };

  const savePack = async (pack: AdminJobCreditPack) => {
    setSavingKey(`pack-${pack.id}`);
    try {
      await adminCommercialService.saveJobCreditPack(pack);
      await load();
      toast({ title: 'Pacote de vagas atualizado', description: `${pack.name} já está disponível com a nova configuração.` });
    } catch (error) {
      toast({
        title: 'Pacote não atualizado',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const updateTemplate = (id: string, patch: Partial<AdminBeatLicenseTemplate>) => {
    setTemplates((current) => current.map((template) => template.id === id ? { ...template, ...patch } : template));
  };

  const saveTemplate = async (template: AdminBeatLicenseTemplate) => {
    setSavingKey(`template-${template.id}`);
    try {
      await adminCommercialService.saveBeatLicenseTemplate(template);
      await load();
      toast({ title: 'Modelo de licença atualizado', description: 'Novos beats utilizarão a configuração publicada.' });
    } catch (error) {
      toast({
        title: 'Modelo não atualizado',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          Carregando parâmetros comerciais...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SlidersHorizontal className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold text-white">Parâmetros comerciais versionados</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Valores publicados passam a valer para novas operações. Pedidos, contratos e movimentações anteriores preservam seus snapshots.
            </p>
          </div>
        </div>

        {parameterGroups.map(([category, items]) => (
          <Card key={category}>
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-primary">{category}</h3>
              <div className="grid gap-5 lg:grid-cols-2">
                {items.map((parameter) => (
                  <div key={parameter.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Label htmlFor={`commercial-${parameter.id}`}>{parameter.label}</Label>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{parameter.description}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] text-muted-foreground">
                        v{parameter.version}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        {parameter.valueType === 'json' ? (
                          <Textarea
                            id={`commercial-${parameter.id}`}
                            rows={4}
                            value={parameterDrafts[parameter.id] ?? ''}
                            onChange={(event) => setParameterDrafts((current) => ({ ...current, [parameter.id]: event.target.value }))}
                          />
                        ) : parameter.valueType === 'boolean' ? (
                          <select
                            id={`commercial-${parameter.id}`}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={parameterDrafts[parameter.id] ?? 'false'}
                            onChange={(event) => setParameterDrafts((current) => ({ ...current, [parameter.id]: event.target.value }))}
                          >
                            <option value="true">Ativado</option>
                            <option value="false">Desativado</option>
                          </select>
                        ) : (
                          <Input
                            id={`commercial-${parameter.id}`}
                            inputMode={parameter.valueType === 'text' ? 'text' : 'numeric'}
                            value={parameterDrafts[parameter.id] ?? ''}
                            onChange={(event) => setParameterDrafts((current) => ({ ...current, [parameter.id]: event.target.value }))}
                          />
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground">Unidade: {parameterUnit(parameter)}</p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => void saveParameter(parameter)}
                        disabled={savingKey === `parameter-${parameter.id}`}
                      >
                        {savingKey === `parameter-${parameter.id}` ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Publicar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BriefcaseBusiness className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold text-white">Pacotes de créditos para vagas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Cada crédito permite uma publicação ou renovação. Não existe cobrança recorrente.</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {packs.map((pack) => (
            <Card key={pack.id}>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Código imutável</Label>
                  <Input value={pack.code} disabled />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome</Label>
                  <Input value={pack.name} onChange={(event) => updatePack(pack.id, { name: event.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea value={pack.description} onChange={(event) => updatePack(pack.id, { description: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade de créditos</Label>
                  <Input type="number" min={1} value={pack.creditQuantity} onChange={(event) => updatePack(pack.id, { creditQuantity: Number(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Preço</Label>
                  <Input type="number" min={0} step="0.01" value={(pack.priceCents / 100).toFixed(2)} onChange={(event) => updatePack(pack.id, { priceCents: Math.round(Number(event.target.value) * 100) })} />
                  <p className="text-[11px] text-muted-foreground">{money.format(pack.priceCents / 100)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Validade do lote em dias</Label>
                  <Input type="number" min={1} value={pack.validityDays} onChange={(event) => updatePack(pack.id, { validityDays: Number(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input type="number" value={pack.sortOrder} onChange={(event) => updatePack(pack.id, { sortOrder: Number(event.target.value) })} />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-white/8 px-3 py-2 sm:col-span-2">
                  <div><p className="text-sm font-medium">Disponível para compra</p><p className="text-xs text-muted-foreground">Desativar não altera créditos já adquiridos.</p></div>
                  <Switch checked={pack.active} onCheckedChange={(active) => updatePack(pack.id, { active })} />
                </div>
                <div className="flex justify-end sm:col-span-2">
                  <Button onClick={() => void savePack(pack)} disabled={savingKey === `pack-${pack.id}`}>
                    {savingKey === `pack-${pack.id}` ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Salvar pacote
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BadgeDollarSign className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold text-white">Modelos comerciais de licença de beat</h2>
            <p className="mt-1 text-sm text-muted-foreground">Os modelos ativos são copiados para cada beat novo. Licenças já vendidas permanecem inalteradas.</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="space-y-2"><Label>Código</Label><Input value={template.code} disabled /></div>
                <div className="space-y-2"><Label>Tipo</Label><Input value={template.licenseType} disabled /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Nome</Label><Input value={template.name} onChange={(event) => updateTemplate(template.id, { name: event.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Descrição</Label><Textarea value={template.description} onChange={(event) => updateTemplate(template.id, { description: event.target.value })} /></div>
                <div className="space-y-2"><Label>Preço</Label><Input type="number" min={0} step="0.01" value={(template.priceCents / 100).toFixed(2)} onChange={(event) => updateTemplate(template.id, { priceCents: Math.round(Number(event.target.value) * 100) })} /></div>
                <div className="space-y-2"><Label>Limite de cópias</Label><Input type="number" min={1} value={template.maxCopies ?? ''} disabled={template.isExclusive} onChange={(event) => updateTemplate(template.id, { maxCopies: event.target.value ? Number(event.target.value) : null })} /></div>
                <div className="space-y-2"><Label>Entregáveis — um por linha</Label><Textarea rows={5} value={template.deliverables.join('\n')} onChange={(event) => updateTemplate(template.id, { deliverables: lineArray(event.target.value) })} /></div>
                <div className="space-y-2"><Label>Direitos — um por linha</Label><Textarea rows={5} value={template.usageRights.join('\n')} onChange={(event) => updateTemplate(template.id, { usageRights: lineArray(event.target.value) })} /></div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-white/8 px-3 py-2 sm:col-span-2">
                  <div><p className="text-sm font-medium">Modelo ativo</p><p className="text-xs text-muted-foreground">A alteração vale apenas para novos beats.</p></div>
                  <Switch checked={template.active} onCheckedChange={(active) => updateTemplate(template.id, { active })} />
                </div>
                <div className="flex justify-end sm:col-span-2">
                  <Button onClick={() => void saveTemplate(template)} disabled={savingKey === `template-${template.id}`}>
                    {savingKey === `template-${template.id}` ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Salvar modelo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CommercialConfigurationPanel;
