import { supabase } from '@/integrations/supabase/client';
import type { BeatLicenseContract } from '@/modules/marketplace/types/product';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

const CONTRACT_BUCKET = 'beat-license-contracts';
const MAX_CONTRACT_SIZE = 20 * 1024 * 1024;
const ALLOWED_CONTRACT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const extensionMimeTypes: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

interface LicenseContractRow {
  license_contract_path: string | null;
  license_contract_file_name: string | null;
  license_contract_mime_type: string | null;
  license_contract_size_bytes: number | null;
  license_contract_updated_at: string | null;
}

const safeName = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]/g, '-')
  .replace(/-+/g, '-');

const resolveMimeType = (file: File): string => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = file.type || extensionMimeTypes[extension] || '';
  if (!ALLOWED_CONTRACT_TYPES.has(mimeType)) {
    throw new Error('Envie o contrato em PDF, DOC ou DOCX.');
  }
  return mimeType;
};

const validateFile = (file: File): string => {
  if (!file.size) throw new Error('O arquivo do contrato está vazio.');
  if (file.size > MAX_CONTRACT_SIZE) throw new Error('O contrato deve ter no máximo 20 MB.');
  return resolveMimeType(file);
};

const currentProducerId = async (): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return getEffectiveUserId(user?.id ?? null);
};

const mapContract = (row: LicenseContractRow | null): BeatLicenseContract | null => {
  if (
    !row?.license_contract_path
    || !row.license_contract_file_name
    || !row.license_contract_mime_type
    || !row.license_contract_size_bytes
    || !row.license_contract_updated_at
  ) {
    return null;
  }

  return {
    path: row.license_contract_path,
    fileName: row.license_contract_file_name,
    mimeType: row.license_contract_mime_type,
    sizeBytes: Number(row.license_contract_size_bytes),
    updatedAt: row.license_contract_updated_at,
  };
};

const readOwnedLicense = async (beatId: string, licenseId: string) => {
  const producerId = await currentProducerId();
  const { data: beat, error: beatError } = await supabase
    .from('beats')
    .select('id,producer_id,is_demo')
    .eq('id', beatId)
    .maybeSingle();

  if (beatError) throw beatError;
  if (!beat || (beat.producer_id !== producerId && !beat.is_demo)) {
    throw new Error('Licença não encontrada para este produtor.');
  }

  const { data: license, error: licenseError } = await supabase
    .from('beat_licenses')
    .select('id,license_contract_path,license_contract_file_name,license_contract_mime_type,license_contract_size_bytes,license_contract_updated_at')
    .eq('id', licenseId)
    .eq('beat_id', beatId)
    .maybeSingle();

  if (licenseError) throw licenseError;
  if (!license) throw new Error('Licença não encontrada.');

  return { producerId: String(beat.producer_id), license: license as LicenseContractRow };
};

export const beatLicenseContractService = {
  async getContract(beatId: string, licenseId: string): Promise<BeatLicenseContract | null> {
    const { license } = await readOwnedLicense(beatId, licenseId);
    return mapContract(license);
  },

  async uploadContract(beatId: string, licenseId: string, file: File): Promise<BeatLicenseContract> {
    const mimeType = validateFile(file);
    const { producerId, license } = await readOwnedLicense(beatId, licenseId);
    const previousPath = license.license_contract_path;
    const path = `${producerId}/${beatId}/${licenseId}/${Date.now()}-${safeName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(CONTRACT_BUCKET)
      .upload(path, file, { contentType: mimeType, upsert: false });
    if (uploadError) throw uploadError;

    const updatedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('beat_licenses')
      .update({
        license_contract_path: path,
        license_contract_file_name: file.name,
        license_contract_mime_type: mimeType,
        license_contract_size_bytes: file.size,
        license_contract_updated_at: updatedAt,
        updated_at: updatedAt,
      })
      .eq('id', licenseId)
      .eq('beat_id', beatId)
      .select('license_contract_path,license_contract_file_name,license_contract_mime_type,license_contract_size_bytes,license_contract_updated_at')
      .single();

    if (updateError || !updated) {
      await supabase.storage.from(CONTRACT_BUCKET).remove([path]);
      throw updateError ?? new Error('Não foi possível vincular o contrato à licença.');
    }

    if (previousPath && previousPath !== path) {
      await supabase.storage.from(CONTRACT_BUCKET).remove([previousPath]);
    }

    const contract = mapContract(updated as LicenseContractRow);
    if (!contract) throw new Error('Metadados do contrato ficaram incompletos.');
    return contract;
  },

  async removeContract(beatId: string, licenseId: string): Promise<void> {
    const { license } = await readOwnedLicense(beatId, licenseId);
    const previousPath = license.license_contract_path;
    const { error } = await supabase
      .from('beat_licenses')
      .update({
        license_contract_path: null,
        license_contract_file_name: null,
        license_contract_mime_type: null,
        license_contract_size_bytes: null,
        license_contract_updated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', licenseId)
      .eq('beat_id', beatId);
    if (error) throw error;
    if (previousPath) await supabase.storage.from(CONTRACT_BUCKET).remove([previousPath]);
  },

  async getDownloadUrl(beatId: string, licenseId: string): Promise<string> {
    const { license } = await readOwnedLicense(beatId, licenseId);
    if (!license.license_contract_path || !license.license_contract_file_name) {
      throw new Error('Nenhum contrato foi enviado para esta licença.');
    }

    const { data, error } = await supabase.storage
      .from(CONTRACT_BUCKET)
      .createSignedUrl(license.license_contract_path, 300, {
        download: license.license_contract_file_name,
      });
    if (error || !data?.signedUrl) throw error ?? new Error('Contrato indisponível no Storage.');
    return data.signedUrl;
  },
};
