import PDFDocument from 'pdfkit';
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

function writeHeader(
  doc: Doc,
  lenderName: string,
  stats: LenderPeriodStats,
): void {
  doc.fontSize(18).text(lenderName);
  doc.fontSize(11).text(`Estadísticas del ${stats.from} al ${stats.to}`);
  doc.moveDown();
}

function writePortfolioSection(doc: Doc, stats: LenderPeriodStats): void {
  doc.fontSize(14).text('Cartera');
  doc.fontSize(11).text(`Cartera total: ${PESOS.format(stats.totalPortfolio)}`);
  doc
    .fontSize(11)
    .text(`Cartera en riesgo: ${PESOS.format(stats.portfolioAtRisk)}`);
  doc.fontSize(11).text(`% en mora: ${percent(stats.arrearsRate)}`);
  doc.moveDown();
}

function writeArrearsByAgeSection(doc: Doc, stats: LenderPeriodStats): void {
  doc.fontSize(14).text('Mora por antigüedad');
  for (const bucket of stats.arrearsByAge) {
    doc
      .fontSize(11)
      .text(
        `${bucket.label} días: ${PESOS.format(bucket.amount)} (${String(bucket.clientsCount)} clientes)`,
      );
  }
  doc.moveDown();
}

function writeTopArrearsSection(doc: Doc, stats: LenderPeriodStats): void {
  doc.fontSize(14).text('Clientes con mayor mora');
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
): void {
  doc.fontSize(14).text('Desempeño por cobrador');
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
 * @returns El PDF completo, en memoria: a esta escala (una página de texto) no hace falta
 * transmitirlo en partes.
 */
export function renderLenderStatsPdf(
  stats: LenderPeriodStats,
  lenderName: string,
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

    writeHeader(doc, lenderName, stats);
    writePortfolioSection(doc, stats);
    writeArrearsByAgeSection(doc, stats);
    writeTopArrearsSection(doc, stats);
    writeCollectorPerformanceSection(doc, stats);

    doc.end();
  });
}
