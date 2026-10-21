import PDFDocument from 'pdfkit';
import type { PdfBrand } from '@/modules/dashboard/application/dtos/lender-stats-export.dto.js';
import type { LenderPeriodStats } from '@/modules/dashboard/application/dtos/lender-stats.dto.js';

type Doc = InstanceType<typeof PDFDocument>;

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** `null` como "N/A"; si no, el porcentaje con un decimal. */
function percent(rate: number | null): string {
  return rate === null ? 'N/A' : `${(rate * 100).toFixed(1)}%`;
}

/** Color de los encabezados cuando el negocio no eligió uno. */
const NEUTRAL_COLOR = '#1F2937';
const TEXT_COLOR = '#000000';
const BAND_HEIGHT = 72;
const MARGIN = 50;

/**
 * Banda con el color del negocio, su logo (si tiene) y el título del reporte. El texto va en blanco:
 * los colores de marca se validan para dar contraste con texto blanco (D-110).
 */
function writeHeader(
  doc: Doc,
  lenderName: string,
  stats: LenderPeriodStats,
  brand: PdfBrand,
): void {
  doc
    .rect(0, 0, doc.page.width, BAND_HEIGHT)
    .fill(brand.color ?? NEUTRAL_COLOR);
  let textX = MARGIN;
  if (brand.logo !== null) {
    try {
      doc.image(brand.logo, MARGIN, 16, { fit: [40, 40] });
      textX = MARGIN + 52;
    } catch {
      textX = MARGIN;
    }
  }
  const width = doc.page.width - textX - MARGIN;
  doc.fillColor('#FFFFFF').fontSize(18).text(lenderName, textX, 16, { width });
  doc
    .fontSize(11)
    .text(`Estadísticas del ${stats.from} al ${stats.to}`, textX, 42, {
      width,
    });
  doc.fillColor(TEXT_COLOR);
  doc.x = MARGIN;
  doc.y = BAND_HEIGHT + 24;
}

/** Título de una sección, en el color del negocio. */
function heading(doc: Doc, title: string, color: string | null): void {
  doc
    .fillColor(color ?? NEUTRAL_COLOR)
    .fontSize(14)
    .text(title);
  doc.fillColor(TEXT_COLOR);
}

function writePortfolioSection(
  doc: Doc,
  stats: LenderPeriodStats,
  color: string | null,
): void {
  heading(doc, 'Cartera', color);
  doc.fontSize(11).text(`Cartera total: ${PESOS.format(stats.totalPortfolio)}`);
  doc
    .fontSize(11)
    .text(`Cartera en riesgo: ${PESOS.format(stats.portfolioAtRisk)}`);
  doc.fontSize(11).text(`% en mora: ${percent(stats.arrearsRate)}`);
  doc.moveDown();
}

function writeArrearsByAgeSection(
  doc: Doc,
  stats: LenderPeriodStats,
  color: string | null,
): void {
  heading(doc, 'Mora por antigüedad', color);
  for (const bucket of stats.arrearsByAge) {
    doc
      .fontSize(11)
      .text(
        `${bucket.label} días: ${PESOS.format(bucket.amount)} (${String(bucket.clientsCount)} clientes)`,
      );
  }
  doc.moveDown();
}

function writeTopArrearsSection(
  doc: Doc,
  stats: LenderPeriodStats,
  color: string | null,
): void {
  heading(doc, 'Clientes con mayor mora', color);
  if (stats.topArrears.length === 0) {
    doc.fontSize(11).text('Sin clientes en mora en el período.');
  }
  for (const entry of stats.topArrears) {
    doc
      .fontSize(11)
      .text(
        `${entry.clientFullName}: ${String(entry.overdueDays)} días, ${PESOS.format(entry.overdueAmount)}`,
      );
  }
  doc.moveDown();
}

function writeCollectorPerformanceSection(
  doc: Doc,
  stats: LenderPeriodStats,
  color: string | null,
): void {
  heading(doc, 'Desempeño por cobrador', color);
  if (stats.collectorPerformance.length === 0) {
    doc.fontSize(11).text('Sin cobradores en el período.');
  }
  for (const collector of stats.collectorPerformance) {
    doc
      .fontSize(11)
      .text(
        `${collector.fullName}: efectividad ${percent(collector.effectiveness)}, mora ${PESOS.format(collector.overdueAmount)}`,
      );
  }
}

/**
 * El reporte de estadísticas en PDF (PROTOTIPO-FLUJOS.md §4.9, D-101): mismos números que
 * `QUERY /lenders/me/stats`, en una página para compartir. `pdfkit` solo se usa aquí, en
 * `infrastructure`: `application` no puede importar paquetes fuera de `@nestjs/common` y
 * `@fiaro-app/contracts` (regla de fronteras, ARCHITECTURE.md §3).
 *
 * @param stats - Las estadísticas del período, tal como las devuelve `GetLenderStatsUseCase`.
 * @param lenderName - El nombre del prestamista, para el encabezado.
 * @param brand - El color y el logo del negocio (D-151): encabezado con su marca.
 * @returns El PDF completo, en memoria: a esta escala (una página de texto) no hace falta
 * transmitirlo en partes.
 */
export function renderLenderStatsPdf(
  stats: LenderPeriodStats,
  lenderName: string,
  brand: PdfBrand,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);

    writeHeader(doc, lenderName, stats, brand);
    writePortfolioSection(doc, stats, brand.color);
    writeArrearsByAgeSection(doc, stats, brand.color);
    writeTopArrearsSection(doc, stats, brand.color);
    writeCollectorPerformanceSection(doc, stats, brand.color);

    doc.end();
  });
}
