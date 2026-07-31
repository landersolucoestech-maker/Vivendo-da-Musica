import { supabase } from '@/integrations/supabase/client';
import type {
  BeatDownload,
  DigitalProductDownload,
  MarketplaceDownload,
} from '@/modules/marketplace/types/download.types';

interface BeatDeliveryRow {
  id: string;
  expires_at: string | null;
  downloaded_at: string | null;
  download_count: number;
  purchase: {
    id: string;
    contract_number: string;
    issued_at: string;
    status: string;
    beat: { title: string };
    license: { name: string };
  };
}

interface ProductFileRow {
  id: string;
  file_name: string;
  product: { title: string };
  orders: Array<{ paid_at: string | null; status: string }>;
}

interface DownloadAccessResponse {
  url?: string;
  error?: string;
}

interface ContractResponse {
  contractNumber: string;
  issuedAt: string;
  beatTitle: string;
  licenseName: string;
  usageRights: unknown;
  deliverables: unknown;
  error?: string;
}

const asStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const escapePdfText = (value: string) => value
  .replaceAll('\\', '\\\\')
  .replaceAll('(', '\\(')
  .replaceAll(')', '\\)')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7E]/g, '');

const createPdf = (lines: string[]): Blob => {
  const commands = lines
    .slice(0, 35)
    .map((line, index) => `${index === 0 ? '' : '0 -18 Td '}(${escapePdfText(line)}) Tj`)
    .join('\n');
  const stream = `BT\n/F1 11 Tf\n50 790 Td\n${commands}\nET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
};

const invokeAccess = async <T>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('download-access', { body });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object') throw new Error('Resposta de download inválida.');
  if ('error' in data && typeof data.error === 'string') throw new Error(data.error);
  return data as T;
};

export const downloadsService = {
  async listDownloads(): Promise<MarketplaceDownload[]> {
    const [beatResult, productResult] = await Promise.all([
      supabase
        .from('beat_deliveries')
        .select('id,expires_at,downloaded_at,download_count,purchase:beat_license_purchases!inner(id,contract_number,issued_at,status,beat:beats!inner(title),license:beat_licenses!inner(name))')
        .eq('purchase.status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from('seller_product_files')
        .select('id,file_name,product:seller_products!inner(title),orders:digital_product_order_items!inner(paid_at,status)')
        .eq('orders.status', 'paid')
        .order('created_at', { ascending: false }),
    ]);

    if (beatResult.error) throw new Error(`Não foi possível carregar os beats: ${beatResult.error.message}`);
    if (productResult.error) throw new Error(`Não foi possível carregar os produtos: ${productResult.error.message}`);

    const beatDownloads: BeatDownload[] = ((beatResult.data ?? []) as unknown as BeatDeliveryRow[]).map((row) => ({
      kind: 'beat',
      id: row.id,
      purchaseId: row.purchase.id,
      contractNumber: row.purchase.contract_number,
      title: row.purchase.beat.title,
      category: 'Beat licenciado',
      licenseName: row.purchase.license.name,
      purchasedAt: row.purchase.issued_at,
      expiresAt: row.expires_at,
      downloadedAt: row.downloaded_at,
      downloadCount: row.download_count,
      isExpired: Boolean(row.expires_at && Date.parse(row.expires_at) <= Date.now()),
    }));

    const productDownloads: DigitalProductDownload[] = ((productResult.data ?? []) as unknown as ProductFileRow[])
      .flatMap((row) => {
        const paidAt = row.orders.find((order) => order.status === 'paid' && order.paid_at)?.paid_at;
        return paidAt ? [{
          kind: 'digital_product' as const,
          id: row.id,
          title: row.product.title,
          category: 'Produto digital',
          fileName: row.file_name,
          purchasedAt: paidAt,
        }] : [];
      });

    return [...beatDownloads, ...productDownloads]
      .sort((left, right) => Date.parse(right.purchasedAt) - Date.parse(left.purchasedAt));
  },

  async listRecommendedDownloads(limit = 2): Promise<BeatDownload[]> {
    const downloads = await this.listDownloads();
    return downloads
      .filter((item): item is BeatDownload => item.kind === 'beat' && !item.isExpired)
      .slice(0, limit);
  },

  async getDownloadUrl(kind: 'beat' | 'product', id: string): Promise<string> {
    const response = await invokeAccess<DownloadAccessResponse>({ kind, id, action: 'download' });
    if (!response.url) throw new Error('Link temporário indisponível.');
    return response.url;
  },

  async getBeatLicenseContract(deliveryId: string): Promise<Blob> {
    const contract = await invokeAccess<ContractResponse>({ kind: 'beat', id: deliveryId, action: 'contract' });
    const lines = [
      'VIVENDO DA MUSICA - CONTRATO DE LICENCA DE BEAT',
      '',
      `Contrato: ${contract.contractNumber}`,
      `Emitido em: ${new Date(contract.issuedAt).toLocaleString('pt-BR')}`,
      `Beat: ${contract.beatTitle}`,
      `Licenca: ${contract.licenseName}`,
      '',
      'Direitos concedidos:',
      ...asStringList(contract.usageRights).map((item) => `- ${item}`),
      '',
      'Arquivos entregues:',
      ...asStringList(contract.deliverables).map((item) => `- ${item}`),
      '',
      'Documento emitido automaticamente pela plataforma Vivendo da Musica.',
    ];
    return createPdf(lines);
  },
};
