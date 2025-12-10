import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export async function GET() {
  try {
    const extensionPath = path.join(process.cwd(), 'public/chrome-extension');

    // Verificar que existe
    if (!fs.existsSync(extensionPath)) {
      console.error(`Extension path not found: ${extensionPath}`);
      return NextResponse.json(
        { error: 'Extension folder not found' },
        { status: 404 }
      );
    }

    // Crear ZIP temporal
    const tempDir = '/tmp';
    const tempZip = path.join(tempDir, `coldmailai-extension-${Date.now()}.zip`);

    try {
      execSync(`cd ${path.join(process.cwd(), 'public')} && zip -r ${tempZip} chrome-extension -q`, {
        stdio: 'pipe',
      });
    } catch (zipError) {
      console.error('ZIP creation error:', zipError);
      return NextResponse.json(
        { error: 'Failed to create ZIP archive' },
        { status: 500 }
      );
    }

    // Verificar que el ZIP se creó
    if (!fs.existsSync(tempZip)) {
      console.error(`ZIP file not created: ${tempZip}`);
      return NextResponse.json(
        { error: 'Failed to create extension package' },
        { status: 500 }
      );
    }

    // Leer archivo
    const fileContent = fs.readFileSync(tempZip);

    // Limpiar temporal
    try {
      fs.unlinkSync(tempZip);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError);
    }

    // Servir
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="coldmailai-extension.zip"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to create extension package' },
      { status: 500 }
    );
  }
}
