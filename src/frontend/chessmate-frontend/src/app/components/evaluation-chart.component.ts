import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  input,
  output
} from '@angular/core';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
} from 'chart.js';
import { ClassifiedMove, CLASSIFICATION_COLORS, MoveClassification } from '../models/classification.models';
import { EVAL_CLAMP_CP } from '../utils/evaluation.utils';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

/**
 * Move classifications that get a colored dot on the chart.
 */
const MARKER_CLASSES: ReadonlySet<MoveClassification> = new Set<MoveClassification>([
  'Brilliant',
  'Great',
  'Mistake',
  'Miss',
  'Blunder'
]);

@Component({
  selector: 'app-evaluation-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="eval-chart-card">
      <div class="eval-chart-wrapper">
        <canvas #chartCanvas></canvas>
      </div>
    </div>
  `,
  styles: [`
    .eval-chart-card {
      border: 3px solid #1f1f1f;
      border-radius: 0.75rem;
      padding: 0.5rem;
      background: #3a3a3a;
    }

    .eval-chart-wrapper {
      position: relative;
      width: 100%;
      height: 120px;
    }

    .eval-chart-wrapper canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `]
})
export class EvaluationChartComponent implements AfterViewInit, OnDestroy {
  /** White-relative centipawn timeline (one entry per position index). */
  public readonly evaluations = input.required<number[]>();

  /** Currently selected position index. */
  public readonly selectedIndex = input.required<number>();

  /** Classified moves array for marker coloring. */
  public readonly classifiedMoves = input<ClassifiedMove[]>([]);

  /** Player color for orientation context. */
  public readonly playerColor = input<'white' | 'black'>('white');

  /** Emits a position index when the user clicks a point on the chart. */
  public readonly positionSelected = output<number>();

  @ViewChild('chartCanvas')
  private canvasRef?: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  protected readonly labels = computed(() =>
    this.evaluations().map((_, i) => String(i))
  );

  /** Convert centipawns to pawns for chart display. */
  protected readonly pawnScores = computed(() =>
    this.evaluations().map(cp => cp / 100)
  );

  /**
   * Build per-position-index arrays for point radius, background color, and border color.
   * Position 0 has no classification; positions 1..N map to classifiedMoves[0..N-1].
   */
  protected readonly pointStyles = computed(() => {
    const evals = this.evaluations();
    const moves = this.classifiedMoves();
    const selected = this.selectedIndex();
    const length = evals.length;

    const radii: number[] = new Array(length).fill(0);
    const bgColors: string[] = new Array(length).fill('transparent');
    const borderColors: string[] = new Array(length).fill('transparent');

    // Mark notable classifications
    for (let i = 0; i < moves.length; i++) {
      const posIndex = i + 1; // position after this ply
      if (posIndex >= length) {
        break;
      }

      const cls = moves[i].classification;
      if (MARKER_CLASSES.has(cls)) {
        radii[posIndex] = 4;
        bgColors[posIndex] = CLASSIFICATION_COLORS[cls];
        borderColors[posIndex] = CLASSIFICATION_COLORS[cls];
      }
    }

    // Selected position overrides (larger, distinctive)
    if (selected >= 0 && selected < length) {
      radii[selected] = Math.max(radii[selected], 5);
      if (bgColors[selected] === 'transparent') {
        bgColors[selected] = '#1565C0';
        borderColors[selected] = '#1565C0';
      }
    }

    return { radii, bgColors, borderColors };
  });

  public constructor() {
    effect(() => {
      const scores = this.pawnScores();
      const index = this.selectedIndex();
      // Touch classifiedMoves to re-run when they change
      this.classifiedMoves();
      this.updateChart(scores, index);
    });
  }

  public ngAfterViewInit(): void {
    this.createChart();
  }

  public ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private createChart(): void {
    if (!this.canvasRef) {
      return;
    }

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const scores = this.pawnScores();
    const labels = this.labels();
    const maxPawn = EVAL_CLAMP_CP / 100;
    const styles = this.pointStyles();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data: scores,
            borderColor: 'rgba(200, 200, 200, 0.8)',
            borderWidth: 1.5,
            pointRadius: styles.radii,
            pointBackgroundColor: styles.bgColors,
            pointBorderColor: styles.borderColors,
            pointBorderWidth: 1,
            pointHoverRadius: 6,
            fill: {
              target: { value: 0 },
              above: 'rgba(255, 255, 255, 0.8)',
              below: 'rgba(44, 44, 44, 0.85)'
            },
            tension: 0.25
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200 },
        layout: {
          padding: { top: 4, bottom: 4, left: 2, right: 2 }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: () => '',
              label: (context) => {
                const val = context.parsed.y ?? 0;
                const sign = val > 0 ? '+' : '';
                return `${sign}${val.toFixed(1)}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: false,
            grid: { display: false }
          },
          y: {
            display: false,
            min: -maxPawn,
            max: maxPawn,
            grid: { display: false }
          }
        },
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            this.positionSelected.emit(elements[0].index);
          }
        }
      }
    });
  }

  private updateChart(scores: number[], _selectedIdx: number): void {
    if (!this.chart) {
      return;
    }

    const dataset = this.chart.data.datasets[0];
    if (!dataset) {
      return;
    }

    const styles = this.pointStyles();

    this.chart.data.labels = this.labels();
    dataset.data = scores;
    (dataset as any).pointRadius = styles.radii;
    (dataset as any).pointBackgroundColor = styles.bgColors;
    (dataset as any).pointBorderColor = styles.borderColors;
    this.chart.update('none');
  }
}
