import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function getDriveClient() {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive credentials not configured');
  }

  const auth = new google.auth.JWT(
    clientEmail,
    undefined,
    privateKey,
    SCOPES
  );

  return google.drive({ version: 'v3', auth });
}

/**
 * Extrae el ID de carpeta de una URL de Google Drive
 */
export function extractFolderIdFromUrl(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Crea una subcarpeta dentro de una carpeta padre
 */
export async function createSubfolder(
  parentFolderId: string,
  folderName: string
): Promise<{ id: string; url: string }> {
  const drive = getDriveClient();

  // Verificar si la subcarpeta ya existe
  const response = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    const existingFolder = response.data.files[0];
    return {
      id: existingFolder.id!,
      url: `https://drive.google.com/drive/folders/${existingFolder.id}`,
    };
  }

  // Crear la subcarpeta
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });

  const folderId = folder.data.id!;

  // Hacer la carpeta pública (cualquiera con el link puede ver)
  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return {
    id: folderId,
    url: `https://drive.google.com/drive/folders/${folderId}`,
  };
}

/**
 * Sube una imagen base64 a Google Drive
 */
export async function uploadBase64Image(
  folderId: string,
  fileName: string,
  base64Data: string
): Promise<string> {
  const drive = getDriveClient();

  // Extraer el contenido base64 (quitar el prefijo data:image/jpeg;base64,)
  const base64Content = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;

  const buffer = Buffer.from(base64Content, 'base64');

  // Determinar el mime type
  let mimeType = 'image/jpeg';
  if (base64Data.includes('image/png')) mimeType = 'image/png';
  if (base64Data.includes('image/webp')) mimeType = 'image/webp';

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType,
    body: buffer,
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id',
  });

  const fileId = file.data.id!;

  // Hacer el archivo público (cualquiera con el link puede ver)
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  // Retornar URL de acceso directo (thumbnail para imágenes)
  return `https://drive.google.com/uc?id=${fileId}&export=view`;
}

/**
 * Obtiene o crea la carpeta de imágenes de un equipo
 */
export async function getOrCreateImagenesFolder(
  attachmentsUrl: string | null,
  equipoCodigo: string,
  equipoNombre: string
): Promise<string | null> {
  if (!attachmentsUrl) {
    return null;
  }

  const parentFolderId = extractFolderIdFromUrl(attachmentsUrl);
  if (!parentFolderId) {
    console.warn('No se pudo extraer folderId de attachments_url:', attachmentsUrl);
    return null;
  }

  try {
    const subfolder = await createSubfolder(parentFolderId, 'imagenes-mantenimiento');
    return subfolder.id;
  } catch (error) {
    console.error('Error creando subcarpeta de imágenes:', error);
    return null;
  }
}
