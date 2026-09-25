// Deprecated - Use document-actions.ts instead.
// Exposing empty wrappers/aliases to prevent compilation errors.

export async function generateSingleCertificate(...args: any[]): Promise<{
  success: boolean;
  error?: string;
  pdfBase64?: string;
  fileName?: string;
}> {
  return { success: false, error: "Deprecated. Use generateSingleDocument instead." };
}

export async function generateBulkCertificates(...args: any[]): Promise<{
  success: boolean;
  error?: string;
  zipBase64?: string;
  fileName?: string;
}> {
  return { success: false, error: "Deprecated. Use generateBulkDocuments instead." };
}
