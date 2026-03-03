import { Component, computed, input, signal } from '@angular/core';
import { CapturedPiecesComponent } from './captured-pieces.component';

@Component({
  selector: 'app-player-bar',
  standalone: true,
  imports: [CapturedPiecesComponent],
  template: `
    <div class="player-bar" [class.player-bar--top]="position() === 'top'">

      <!-- Avatar -->
      <div class="player-avatar" role="img" [attr.aria-label]="username() + ' profile'">
        @if (resolvedAvatarUrl()) {
          <img
            class="avatar-img"
            [src]="resolvedAvatarUrl()!"
            [alt]="username() + ' profile picture'"
            (error)="onAvatarError()" />
        } @else {
          <div class="avatar-fallback" aria-hidden="true">{{ initials() }}</div>
        }
      </div>

      <!-- Info block: name row + captured pieces -->
      <div class="player-info">
        <div class="player-name-row">
          @if (flagEmoji()) {
            <span class="player-flag" role="img" [attr.aria-label]="(countryCode() ?? '') + ' flag'">{{ flagEmoji() }}</span>
          }
          <span class="player-name">{{ username() }}</span>
          @if (rating()) {
            <span class="player-rating">({{ rating() }})</span>
          }
        </div>
        <app-captured-pieces [fen]="fen()" [capturedByColor]="capturedByColor()" />
      </div>

    </div>
  `,
  styles: [`
    .player-bar {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.4rem 0.25rem;
    }

    /* Avatar — rounded square */
    .player-avatar {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 6px;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.12);
      background: #3a3a4a;
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.55);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* Info column */
    .player-info {
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
      min-width: 0;
    }

    .player-name-row {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      flex-wrap: nowrap;
    }

    .player-flag {
      font-size: 0.9rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .player-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--cm-text-primary, #f0f0f0);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .player-rating {
      font-size: 0.78rem;
      color: var(--cm-text-secondary, #aaa);
      flex-shrink: 0;
    }
  `]
})
export class PlayerBarComponent {
  readonly username = input.required<string>();
  readonly rating = input<number | null | undefined>(undefined);
  readonly avatarUrl = input<string | null | undefined>(undefined);
  readonly countryCode = input<string | null | undefined>(undefined);
  readonly fen = input<string>('');
  readonly capturedByColor = input<'white' | 'black'>('white');
  readonly position = input<'top' | 'bottom'>('bottom');

  private readonly avatarLoadFailed = signal(false);

  readonly initials = computed(() => {
    const name = this.username();
    return name ? name.slice(0, 2).toUpperCase() : '??';
  });

  readonly resolvedAvatarUrl = computed(() => {
    if (this.avatarLoadFailed()) return null;
    const url = this.avatarUrl();
    return url ?? null;
  });

  readonly flagEmoji = computed(() => {
    const code = this.countryCode();
    if (!code || code.length !== 2) return null;
    // Regional Indicator Symbol Letters start at U+1F1E6 ('A')
    const base = 0x1F1E6;
    const upper = code.toUpperCase();
    const points = [...upper].map(ch => base + ch.charCodeAt(0) - 0x41);
    return String.fromCodePoint(...points);
  });

  protected onAvatarError(): void {
    this.avatarLoadFailed.set(true);
  }
}
