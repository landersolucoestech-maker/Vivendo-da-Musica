import { MOCK_BEATS } from "@/mocks/beats.mock";
import { supabase } from "@/integrations/supabase/client";
import type { Product, ProductReview, ProductQA, ProductLicense, Beat, BeatLicense, ProducerBeatDashboard } from "@/modules/marketplace/types/product";
import type { BeatDownload, DigitalProductDownload, MarketplaceDownload } from "@/modules/marketplace/types/download.types";

interface BeatRow {
  id: string;
  slug: string;
  title: string;
  producer_id: string;
  genre: string;
  bpm: number | null;
  musical_key: string | null;
  mood: string | null;
  duration_seconds: number | null;
  cover_url: string | null;
  preview_file_path: string | null;
  copyright_status: Beat["copyrightStatus"];
  status: Beat["status"];
  exclusive_available: boolean;
  published_at: string | null;
  beat_licenses: BeatLicenseRow[] | null;
}

interface SellerProductCatalogRow {
  id: string;
  slug: string;
  title: string;
  product_type: "preset" | "drum_kit" | "midi" | "plugin" | "template" | "project" | "ebook" | "other";
  description: string | null;
  price_cents: number;
  currency: string;
}

interface BeatLicenseRow {
  id: string;
  license_type: BeatLicense["type"];
  name: string;
  price_cents: number;
  currency: string;
  deliverables: unknown;
  usage_rights: unknown;
  max_copies: number | null;
  is_exclusive: boolean;
  available: boolean;
}

interface ProducerBeatRow extends BeatRow {
  beat_events: { event_type: "view" | "play" | "add_to_cart" | "checkout" | "purchase" }[] | null;
  beat_order_items: { amount_cents: number }[] | null;
}

interface BeatDeliveryRow {
  id: string;
  file_label: string;
  expires_at: string | null;
  downloaded_at: string | null;
  download_count: number;
  beat_license_purchases: {
    id: string;
    contract_number: string;
    issued_at: string;
    status: "active" | "revoked" | "refunded";
    beats: { title: string };
    beat_licenses: { name: string };
  };
}

interface DigitalProductOrderItemDownloadRow {
  id: string;
  paid_at: string | null;
  seller_products: {
    title: string;
    seller_product_files: { id: string; file_name: string }[] | null;
  };
}

interface ProducerFinancialAccountRow {
  currency: string;
  ledger_entries: { amount_cents: number }[] | null;
}

interface PlatformFinancialSettingsRow {
  default_commission_bps: number;
  payout_minimum_cents: number;
  payout_delay_days: number;
}

interface ProducerPayoutBalanceRow {
  current_balance_cents: number;
  eligible_balance_cents: number;
  next_eligibility_at: string | null;
}

interface ProducerPayoutMethodRow {
  id: string;
  method_type: "pix" | "bank_account";
  display_label: string;
  is_default: boolean;
}

interface ProducerPayoutRequestRow {
  id: string;
  amount_cents: number;
  status: "requested" | "processing" | "paid" | "failed" | "canceled";
  requested_at: string;
}

export interface CreateBeatPayload {
  title: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  mood: string;
  description?: string;
  previewFile: File;
  masterFile: File;
  stemsFile?: File;
}

export interface UpdateBeatPayload {
  title: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  mood: string;
}

export interface UpdateBeatLicensePayload {
  name: string;
  priceCents: number;
  maxCopies?: number;
  usageRights: string[];
  deliverables: string[];
  available: boolean;
}

const BEAT_GRADIENTS = [
  ["#6d28d9", "#db2777"],
  ["#0f766e", "#2563eb"],
  ["#b45309", "#dc2626"],
  ["#4338ca", "#7e22ce"],
] as const;

const PRODUCT_GRADIENTS = [
  ["#7c3aed", "#db2777"],
  ["#0369a1", "#0891b2"],
  ["#b45309", "#ea580c"],
  ["#4338ca", "#7e22ce"],
] as const;

const PRODUCT_TYPE_LABELS: Record<SellerProductCatalogRow["product_type"], string> = {
  preset: "Presets",
  drum_kit: "Drum Kits",
  midi: "MIDI",
  plugin: "Plugins",
  template: "Templates",
  project: "Projetos",
  ebook: "E-books",
  other: "Outros",
};

const mapSellerProductRow = (row: SellerProductCatalogRow, index: number): Product => {
  const [gradientFrom, gradientTo] = PRODUCT_GRADIENTS[index % PRODUCT_GRADIENTS.length];
  return { id: row.id, slug: row.slug, title: row.title, category: PRODUCT_TYPE_LABELS[row.product_type], priceCents: row.price_cents, currency: row.currency, gradientFrom, gradientTo };
};

const listPublishedProductRows = async (): Promise<SellerProductCatalogRow[]> => {
  const table = supabase.from as unknown as (name: "seller_products") => {
    select(columns: string): { eq(column: string, value: string): { order(column: string, options: { ascending: boolean }): Promise<{ data: SellerProductCatalogRow[] | null; error: { message: string } | null }> } };
  };
  const { data, error } = await table("seller_products")
    .select("id, slug, title, product_type, description, price_cents, currency")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`Nao foi possivel carregar os produtos: ${error.message}`);
  return data ?? [];
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const mapBeatLicenseRow = (row: BeatLicenseRow): BeatLicense => ({
  id: row.id,
  type: row.license_type,
  name: row.name,
  priceCents: row.price_cents,
  currency: row.currency,
  deliverables: toStringArray(row.deliverables),
  usageRights: toStringArray(row.usage_rights),
  ...(row.max_copies === null ? {} : { maxCopies: row.max_copies }),
  isExclusive: row.is_exclusive,
  available: row.available,
});

const getBeatPreviewUrl = (filePath: string | null): string | null => {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;

  return supabase.storage.from("beat-previews").getPublicUrl(filePath).data.publicUrl;
};

const slugifyBeatTitle = (title: string): string =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const uploadBeatFile = async (bucket: string, path: string, file: File): Promise<string> => {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload de ${file.name}: ${error.message}`);
  return path;
};

const mapBeatRow = (row: BeatRow, index: number): Beat => {
  const mockBeat = MOCK_BEATS.find((beat) => beat.slug === row.slug);
  const [gradientFrom, gradientTo] = BEAT_GRADIENTS[index % BEAT_GRADIENTS.length];

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    producerId: row.producer_id,
    producerName: mockBeat?.producerName ?? "Produtor independente",
    genre: row.genre,
    bpm: row.bpm ?? 0,
    key: row.musical_key ?? "N/A",
    mood: row.mood ?? "Sem mood",
    durationSeconds: row.duration_seconds ?? 0,
    coverUrl: row.cover_url,
    audioPreviewUrl: getBeatPreviewUrl(row.preview_file_path),
    gradientFrom: mockBeat?.gradientFrom ?? gradientFrom,
    gradientTo: mockBeat?.gradientTo ?? gradientTo,
    views: 0,
    plays: 0,
    sales: 0,
    revenueCents: 0,
    conversionRate: 0,
    exclusiveAvailable: row.exclusive_available,
    copyrightStatus: row.copyright_status,
    status: row.status,
    copyrightEvidenceId: mockBeat?.copyrightEvidenceId,
    publishedAt: row.published_at ?? "",
    licenses: (row.beat_licenses ?? [])
      .map(mapBeatLicenseRow)
      .sort((a, b) => a.priceCents - b.priceCents),
  };
};

/**
 * marketplace.service — TODO(backend): there is no `products` table yet.
 * Every function here returns the mock catalog; once the schema exists,
 * only the function bodies change to real Supabase queries — hooks and
 * components keep calling the exact same signatures.
 */
export const marketplaceService = {
  async listProducts(): Promise<Product[]> {
    return (await listPublishedProductRows()).map(mapSellerProductRow);
  },

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const rows = await listPublishedProductRows();
    const index = rows.findIndex((row) => row.slug === slug);
    return index < 0 ? undefined : mapSellerProductRow(rows[index], index);
  },

  async getProductById(id: string): Promise<Product | undefined> {
    return (await this.listProducts()).find((product) => product.id === id);
  },

  async listRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
    return (await this.listProducts()).filter((item) => item.id !== product.id && item.category === product.category).slice(0, limit);
  },

  async listCategories(): Promise<readonly string[]> {
    const categories: string[] = (await this.listProducts()).map((product) => String(product.category));
    return [...new Set<string>(categories)];
  },

  async getProductDescription(slug: string): Promise<string> {
    return (await listPublishedProductRows()).find((product) => product.slug === slug)?.description ?? "";
  },

  async getProductReviews(_slug: string): Promise<ProductReview[]> {
    return [];
  },

  async getProductQA(_slug: string): Promise<ProductQA[]> {
    return [];
  },

  async getProductLicense(_slug: string): Promise<ProductLicense> {
    return "Padrao";
  },

  async getProductIncludedFiles(_slug: string): Promise<string[]> {
    return ["Download digital protegido"];
  },

  async getProductDetailBundle(slug: string) {
    const product = await this.getProductBySlug(slug);
    if (!product) return undefined;

    const [description, reviews, qa, license, includedFiles, related] = await Promise.all([
      this.getProductDescription(slug),
      this.getProductReviews(slug),
      this.getProductQA(slug),
      this.getProductLicense(slug),
      this.getProductIncludedFiles(slug),
      this.listRelatedProducts(product),
    ]);

    return { product, description, reviews, qa, license, includedFiles, related };
  },

  async listDownloads(): Promise<MarketplaceDownload[]> {
    const query = supabase.from as unknown as (table: "beat_deliveries") => {
      select(columns: string): {
        order(column: string, options: { ascending: boolean }): Promise<{
          data: BeatDeliveryRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
    const { data, error } = await query("beat_deliveries")
      .select("id, file_label, expires_at, downloaded_at, download_count, beat_license_purchases!inner(id, contract_number, issued_at, status, beats!inner(title), beat_licenses!inner(name))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Nao foi possivel carregar seus downloads: ${error.message}`);

    const beatDownloads: BeatDownload[] = (data ?? []).map((row) => ({
      kind: "beat",
      id: row.id,
      purchaseId: row.beat_license_purchases.id,
      contractNumber: row.beat_license_purchases.contract_number,
      title: row.beat_license_purchases.beats.title,
      category: row.file_label,
      licenseName: row.beat_license_purchases.beat_licenses.name,
      purchasedAt: row.beat_license_purchases.issued_at,
      expiresAt: row.expires_at,
      downloadedAt: row.downloaded_at,
      downloadCount: row.download_count,
      isExpired: Boolean(row.expires_at && new Date(row.expires_at).getTime() <= Date.now()),
    }));

    const productQuery = supabase.from as unknown as (table: "digital_product_order_items") => {
      select(columns: string): { order(column: string, options: { ascending: boolean }): Promise<{ data: DigitalProductOrderItemDownloadRow[] | null; error: { message: string } | null }> };
    };
    const { data: productItems, error: productError } = await productQuery("digital_product_order_items")
      .select("id, paid_at, seller_products!inner(title, seller_product_files(id, file_name))")
      .order("created_at", { ascending: false });
    if (productError) throw new Error(`Nao foi possivel carregar os produtos comprados: ${productError.message}`);

    const productDownloads: DigitalProductDownload[] = (productItems ?? []).flatMap((item) =>
      item.paid_at ? (item.seller_products.seller_product_files ?? []).map((file) => ({
        kind: "digital_product" as const,
        id: file.id,
        title: item.seller_products.title,
        category: "Produto digital",
        fileName: file.file_name,
        purchasedAt: item.paid_at as string,
      })) : [],
    );
    return [...beatDownloads, ...productDownloads].sort((a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt));
  },

  async listRecommendedDownloads(limit = 2): Promise<BeatDownload[]> {
    const downloads = await this.listDownloads();
    return downloads.filter((download): download is BeatDownload => download.kind === "beat" && !download.isExpired).slice(0, limit);
  },

  async getBeatDownloadUrl(deliveryId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("get-beat-download-url", {
      body: { deliveryId },
    });
    if (error) throw new Error(error.message);
    if (!data?.url) throw new Error(data?.error ?? "Link seguro indisponivel");
    return data.url;
  },

  async getDigitalProductDownloadUrl(fileId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("get-digital-product-download-url", { body: { fileId } });
    if (error) throw new Error(error.message);
    if (!data?.url) throw new Error(data?.error ?? "Link seguro indisponivel");
    return data.url as string;
  },

  async getBeatLicenseContract(purchaseId: string): Promise<Blob> {
    const { data, error } = await supabase.functions.invoke("get-beat-license-contract", {
      body: { purchaseId },
    });
    if (error) throw new Error(error.message);
    if (!(data instanceof Blob)) throw new Error(data?.error ?? "Contrato indisponivel");
    return data;
  },

  async listBeats(): Promise<Beat[]> {
    // `beats` was added after the last generated Database types snapshot.
    const query = supabase.from as unknown as (table: "beats") => {
      select(columns: string): {
        eq(column: string, value: string): {
          order(column: string, options: { ascending: boolean }): Promise<{
            data: BeatRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { data, error } = await query("beats")
      .select("id, slug, title, producer_id, genre, bpm, musical_key, mood, duration_seconds, cover_url, preview_file_path, copyright_status, status, exclusive_available, published_at, beat_licenses(id, license_type, name, price_cents, currency, deliverables, usage_rights, max_copies, is_exclusive, available)")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      throw new Error(`Nao foi possivel carregar os beats: ${error.message}`);
    }

    return (data ?? []).map(mapBeatRow);
  },

  async getBeatBySlug(slug: string) {
    const beats = await this.listBeats();
    return beats.find((beat) => beat.slug === slug);
  },

  async getBeatDetailBundle(slug: string) {
    const beats = await this.listBeats();
    const beat = beats.find((item) => item.slug === slug);
    if (!beat) return undefined;

    return {
      beat,
      related: beats.filter((item) => item.genre === beat.genre && item.id !== beat.id).slice(0, 4),
    };
  },

  async recordBeatEvent(beatId: string, eventType: "view" | "play"): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return;

    const eventsTable = supabase.from as unknown as (table: "beat_events") => {
      insert(payload: {
        beat_id: string;
        user_id: string;
        event_type: "view" | "play";
      }): Promise<{ error: { message: string } | null }>;
    };

    const { error } = await eventsTable("beat_events").insert({
      beat_id: beatId,
      user_id: authData.user.id,
      event_type: eventType,
    });

    if (error) {
      throw new Error(`Nao foi possivel registrar o evento do beat: ${error.message}`);
    }
  },

  async createBeat(payload: CreateBeatPayload): Promise<string> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Entre na sua conta para publicar um beat.");

    const producerId = authData.user.id;
    const beatId = crypto.randomUUID();
    const basePath = `${producerId}/${beatId}`;
    const previewPath = await uploadBeatFile("beat-previews", `${basePath}/preview-${payload.previewFile.name}`, payload.previewFile);
    const masterPath = await uploadBeatFile("beat-masters", `${basePath}/master-${payload.masterFile.name}`, payload.masterFile);
    const stemsPath = payload.stemsFile
      ? await uploadBeatFile("beat-stems", `${basePath}/stems-${payload.stemsFile.name}`, payload.stemsFile)
      : null;

    const beatsTable = supabase.from as unknown as (table: "beats") => {
      insert(values: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
    };
    const slug = `${slugifyBeatTitle(payload.title)}-${beatId.slice(0, 8)}`;
    const { error: beatError } = await beatsTable("beats").insert({
      id: beatId,
      producer_id: producerId,
      title: payload.title.trim(),
      slug,
      description: payload.description?.trim() || null,
      genre: payload.genre.trim(),
      bpm: payload.bpm,
      musical_key: payload.musicalKey.trim(),
      mood: payload.mood.trim(),
      preview_file_path: previewPath,
      master_file_path: masterPath,
      stems_file_path: stemsPath,
      status: "draft",
    });
    if (beatError) throw new Error(`Falha ao cadastrar o beat: ${beatError.message}`);

    const licensesTable = supabase.from as unknown as (table: "beat_licenses") => {
      insert(values: Record<string, unknown>[]): Promise<{ error: { message: string } | null }>;
    };
    const { error: licenseError } = await licensesTable("beat_licenses").insert([
      { beat_id: beatId, license_type: "basic", name: "Basic License", price_cents: 7900, usage_rights: ["Uso comercial limitado", "Ate 10.000 streams"], deliverables: ["MP3 tagged", "Contrato PDF"], max_copies: 10000 },
      { beat_id: beatId, license_type: "premium", name: "Premium License", price_cents: 14900, usage_rights: ["Uso comercial ampliado", "Ate 100.000 streams"], deliverables: ["MP3 sem tag", "WAV 24-bit", "Contrato PDF"], max_copies: 100000 },
      { beat_id: beatId, license_type: "unlimited", name: "Unlimited License", price_cents: 29900, usage_rights: ["Streams ilimitados", "Monetizacao liberada"], deliverables: ["WAV 24-bit", "Stems quando disponiveis", "Contrato PDF"] },
      { beat_id: beatId, license_type: "exclusive", name: "Exclusive Rights", price_cents: 149900, usage_rights: ["Uso comercial exclusivo", "Beat removido de novas vendas"], deliverables: ["WAV master", "Stems", "Contrato exclusivo"], is_exclusive: true },
    ]);
    if (licenseError) throw new Error(`Beat criado, mas as licencas falharam: ${licenseError.message}`);

    return beatId;
  },

  async updateBeat(beatId: string, payload: UpdateBeatPayload): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Entre na sua conta para editar o beat.");

    const table = supabase.from as unknown as (name: "beats") => {
      update(values: Record<string, unknown>): {
        eq(column: string, value: string): {
          eq(column: string, value: string): Promise<{ error: { message: string } | null }>;
        };
      };
    };
    const { error } = await table("beats").update({
      title: payload.title.trim(),
      genre: payload.genre.trim(),
      bpm: payload.bpm,
      musical_key: payload.musicalKey.trim(),
      mood: payload.mood.trim(),
    }).eq("id", beatId).eq("producer_id", authData.user.id);
    if (error) throw new Error(`Nao foi possivel editar o beat: ${error.message}`);
  },

  async setBeatStatus(beatId: string, status: Beat["status"]): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Entre na sua conta para alterar o beat.");

    const table = supabase.from as unknown as (name: "beats") => {
      update(values: Record<string, unknown>): {
        eq(column: string, value: string): {
          eq(column: string, value: string): Promise<{ error: { message: string } | null }>;
        };
      };
    };
    const { error } = await table("beats")
      .update({ status })
      .eq("id", beatId)
      .eq("producer_id", authData.user.id);
    if (error) throw new Error(`Nao foi possivel alterar o status do beat: ${error.message}`);
  },

  async updateBeatLicense(beatId: string, licenseId: string, payload: UpdateBeatLicensePayload): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Entre na sua conta para editar a licenca.");
    if (!Number.isInteger(payload.priceCents) || payload.priceCents < 0) throw new Error("Informe um preco valido.");

    const table = supabase.from as unknown as (name: "beat_licenses") => {
      update(values: Record<string, unknown>): {
        eq(column: string, value: string): {
          eq(column: string, value: string): Promise<{ error: { message: string } | null }>;
        };
      };
    };
    const { error } = await table("beat_licenses").update({
      name: payload.name.trim(),
      price_cents: payload.priceCents,
      max_copies: payload.maxCopies ?? null,
      usage_rights: payload.usageRights,
      deliverables: payload.deliverables,
      available: payload.available,
    }).eq("id", licenseId).eq("beat_id", beatId);
    if (error) throw new Error(`Nao foi possivel editar a licenca: ${error.message}`);
  },

  async getProducerBeatDashboard(): Promise<ProducerBeatDashboard> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Entre na sua conta para acessar a gestao de beats.");

    const query = supabase.from as unknown as (table: "beats") => {
      select(columns: string): {
        eq(column: string, value: string): {
          order(column: string, options: { ascending: boolean }): Promise<{ data: ProducerBeatRow[] | null; error: { message: string } | null }>;
        };
      };
    };
    const { data, error } = await query("beats")
      .select("id, slug, title, producer_id, genre, bpm, musical_key, mood, duration_seconds, cover_url, preview_file_path, copyright_status, status, exclusive_available, published_at, beat_licenses(id, license_type, name, price_cents, currency, deliverables, usage_rights, max_copies, is_exclusive, available), beat_events(event_type), beat_order_items(amount_cents)")
      .eq("producer_id", authData.user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Nao foi possivel carregar a gestao de beats: ${error.message}`);

    const beats = (data ?? []).map((row, index) => {
      const beat = mapBeatRow(row, index);
      const views = (row.beat_events ?? []).filter((event) => event.event_type === "view").length;
      const plays = (row.beat_events ?? []).filter((event) => event.event_type === "play").length;
      const sales = (row.beat_order_items ?? []).length;
      const revenueCents = (row.beat_order_items ?? []).reduce((sum, item) => sum + item.amount_cents, 0);
      return { ...beat, views, plays, sales, revenueCents, conversionRate: views ? Number(((sales / views) * 100).toFixed(2)) : 0 };
    });
    const totalViews = beats.reduce((sum, beat) => sum + beat.views, 0);
    const totalPlays = beats.reduce((sum, beat) => sum + beat.plays, 0);
    const totalSales = beats.reduce((sum, beat) => sum + beat.sales, 0);
    const totalRevenueCents = beats.reduce((sum, beat) => sum + beat.revenueCents, 0);

    const financialQuery = supabase.from as unknown as (table: "financial_accounts") => {
      select(columns: string): {
        eq(column: string, value: string): {
          eq(column: string, value: string): Promise<{
            data: ProducerFinancialAccountRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data: financialAccounts, error: financialError } = await financialQuery("financial_accounts")
      .select("currency, ledger_entries(amount_cents)")
      .eq("account_type", "producer_payable")
      .eq("owner_user_id", authData.user.id);
    if (financialError) throw new Error(`Nao foi possivel carregar o saldo financeiro: ${financialError.message}`);
    const primaryAccount = financialAccounts?.[0];
    const fallbackBalanceCents = -(primaryAccount?.ledger_entries ?? [])
      .reduce((sum, entry) => sum + Number(entry.amount_cents), 0);
    const rpc = supabase.rpc as unknown as (name: "get_producer_payout_balance", args: Record<string, unknown>) => Promise<{
      data: ProducerPayoutBalanceRow[] | null;
      error: { message: string } | null;
    }>;
    const { data: payoutBalances, error: payoutBalanceError } = await rpc("get_producer_payout_balance", {
      target_producer_id: authData.user.id,
      target_currency: primaryAccount?.currency ?? "BRL",
    });
    if (payoutBalanceError) throw new Error(`Nao foi possivel calcular o saldo elegivel: ${payoutBalanceError.message}`);
    const payoutBalance = payoutBalances?.[0];
    const settingsTable = supabase.from as unknown as (table: "platform_financial_settings") => {
      select(columns: string): {
        single(): Promise<{ data: PlatformFinancialSettingsRow | null; error: { message: string } | null }>;
      };
    };
    const { data: settings, error: settingsError } = await settingsTable("platform_financial_settings")
      .select("default_commission_bps, payout_minimum_cents, payout_delay_days")
      .single();
    if (settingsError || !settings) throw new Error("Nao foi possivel carregar as regras financeiras.");
    const overrideTable = supabase.from as unknown as (table: "producer_commission_overrides") => {
      select(columns: string): {
        eq(column: string, value: string): {
          maybeSingle(): Promise<{ data: { commission_bps: number } | null; error: { message: string } | null }>;
        };
      };
    };
    const { data: commissionOverride, error: overrideError } = await overrideTable("producer_commission_overrides")
      .select("commission_bps")
      .eq("producer_id", authData.user.id)
      .maybeSingle();
    if (overrideError) throw new Error("Nao foi possivel carregar sua taxa de comissao.");

    const payoutMethodsTable = supabase.from as unknown as (table: "producer_payout_methods") => {
      select(columns: string): {
        eq(column: string, value: string): {
          eq(column: string, value: string): Promise<{ data: ProducerPayoutMethodRow[] | null; error: { message: string } | null }>;
        };
      };
    };
    const { data: payoutMethods, error: payoutMethodsError } = await payoutMethodsTable("producer_payout_methods")
      .select("id, method_type, display_label, is_default")
      .eq("producer_id", authData.user.id)
      .eq("status", "verified");
    if (payoutMethodsError) throw new Error(`Nao foi possivel carregar os metodos de repasse: ${payoutMethodsError.message}`);

    const payoutRequestsTable = supabase.from as unknown as (table: "producer_payout_requests") => {
      select(columns: string): {
        eq(column: string, value: string): {
          order(column: string, options: { ascending: boolean }): {
            limit(count: number): Promise<{ data: ProducerPayoutRequestRow[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
    const { data: payoutRequests, error: payoutRequestsError } = await payoutRequestsTable("producer_payout_requests")
      .select("id, amount_cents, status, requested_at")
      .eq("producer_id", authData.user.id)
      .order("requested_at", { ascending: false })
      .limit(10);
    if (payoutRequestsError) throw new Error(`Nao foi possivel carregar os repasses: ${payoutRequestsError.message}`);

    return {
      financial: {
        availableBalanceCents: Number(payoutBalance?.current_balance_cents ?? fallbackBalanceCents),
        eligibleBalanceCents: Number(payoutBalance?.eligible_balance_cents ?? 0),
        nextEligibilityAt: payoutBalance?.next_eligibility_at ?? null,
        currency: primaryAccount?.currency ?? "BRL",
        commissionBps: commissionOverride?.commission_bps ?? settings.default_commission_bps,
        payoutMinimumCents: Number(settings.payout_minimum_cents),
        payoutDelayDays: settings.payout_delay_days,
        payoutMethods: (payoutMethods ?? []).map((method) => ({
          id: method.id,
          type: method.method_type,
          label: method.display_label,
          isDefault: method.is_default,
        })),
        payoutRequests: (payoutRequests ?? []).map((request) => ({
          id: request.id,
          amountCents: Number(request.amount_cents),
          status: request.status,
          requestedAt: request.requested_at,
        })),
      },
      totals: {
        totalSales,
        totalRevenueCents,
        totalViews,
        totalPlays,
        averageConversionRate: totalViews ? Number(((totalSales / totalViews) * 100).toFixed(2)) : 0,
      },
      ranking: [...beats].sort((a, b) => b.sales - a.sales),
      transactions: [],
      beats,
    };
  },

  async requestProducerPayout(payoutMethodId: string, amountCents: number, currency: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("request-producer-payout", {
      body: {
        payoutMethodId,
        amountCents,
        currency,
        idempotencyKey: `payout_${crypto.randomUUID()}`,
      },
    });
    if (error) throw new Error(error.message || "Nao foi possivel solicitar o repasse.");
    if (!data?.payoutId) throw new Error(data?.error || "Resposta invalida ao solicitar o repasse.");
    return data.payoutId as string;
  },

  /** No real table yet — simulates create/update so the admin flow is fully
   * navigable; swap for real insert/update once the schema exists. */
  async createProduct(_payload: { title: string; category: string; description: string; priceCents: number }): Promise<{ error: null }> {
    return { error: null };
  },

  async updateProduct(_id: string, _payload: { title: string; category: string; description: string; priceCents: number }): Promise<{ error: null }> {
    return { error: null };
  },
};
