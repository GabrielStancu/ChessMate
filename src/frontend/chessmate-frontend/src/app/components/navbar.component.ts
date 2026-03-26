import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <a class="nav-brand" routerLink="/">
        <img src="assets/images/logo.png" alt="ChessMate" class="nav-logo" />
        <span class="brand-text"><span class="brand-chess">Chess</span><span class="brand-mate">Mate</span></span>
      </a>
      <div class="nav-links">
        <a class="nav-link" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Analyze Games
        </a>
        <a class="nav-link" routerLink="/openings" routerLinkActive="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          Opening Explorer
        </a>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      display: flex;
      align-items: center;
      gap: 2rem;
      height: var(--navbar-height, 84px);
      padding: 0 1.75rem;
      background: #111111;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      font-weight: 700;
      line-height: 1;
    }

    .nav-logo {
      width: 54px;
      height: 54px;
      border-radius: 4px;
      vertical-align: middle;
    }

    .brand-text {
      font-size: 1.25rem;
    }

    .brand-chess {
      color: var(--cm-text-primary, #f0f0f0);
    }

    .brand-mate {
      color: var(--cm-accent, #d4a843);
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-left: auto;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.9rem;
      border-radius: var(--cm-radius-sm, 0.5rem);
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--cm-text-secondary, #9a9ab0);
      transition: color 0.15s, background 0.15s;
    }

    .nav-link:hover {
      color: var(--cm-text-primary, #f0f0f0);
      background: rgba(255, 255, 255, 0.05);
    }

    .nav-link.active {
      color: var(--cm-accent, #d4a843);
      background: var(--cm-accent-dim, rgba(212, 168, 67, 0.15));
    }

    .nav-link svg {
      flex-shrink: 0;
      width: 17px;
      height: 17px;
    }

    @media (max-width: 600px) {
      .navbar {
        gap: 0.75rem;
        padding: 0 1rem;
        height: 56px;
      }

      .nav-logo {
        width: 38px;
        height: 38px;
      }

      .brand-text {
        font-size: 1rem;
      }

      .nav-links {
        gap: 0.15rem;
      }

      .nav-link {
        padding: 0.4rem 0.55rem;
        font-size: 0;
        gap: 0;
        justify-content: center;
      }

      .nav-link svg {
        width: 20px;
        height: 20px;
      }
    }
  `]
})
export class NavbarComponent {}
