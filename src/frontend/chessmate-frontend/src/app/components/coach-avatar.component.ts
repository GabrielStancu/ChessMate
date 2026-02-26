import { Component } from '@angular/core';

/**
 * Chess coach avatar SVG following locked style direction:
 * thick dark outlines, rounded edges, minimalist facial features,
 * flat vibrant colors, white border around the shape.
 */
@Component({
  selector: 'app-coach-avatar',
  standalone: true,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      class="coach-avatar-svg"
      aria-label="AI Coach Avatar">
      <!-- White border circle -->
      <circle cx="40" cy="40" r="38" fill="#ffffff" stroke="#1f1f1f" stroke-width="4" />
      <!-- Body / torso -->
      <ellipse cx="40" cy="62" rx="22" ry="12" fill="#1565C0" stroke="#1f1f1f" stroke-width="3" rx="22" />
      <!-- Head -->
      <circle cx="40" cy="30" r="16" fill="#FFCC80" stroke="#1f1f1f" stroke-width="3" />
      <!-- Graduation cap base -->
      <rect x="24" y="16" width="32" height="6" rx="2" fill="#1f1f1f" stroke="#1f1f1f" stroke-width="1" />
      <!-- Cap top -->
      <polygon points="40,8 56,18 24,18" fill="#1f1f1f" stroke="#1f1f1f" stroke-width="1" stroke-linejoin="round" />
      <!-- Tassel -->
      <line x1="52" y1="18" x2="56" y2="26" stroke="#FFD54F" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="56" cy="27" r="2" fill="#FFD54F" stroke="#1f1f1f" stroke-width="1" />
      <!-- Eyes -->
      <circle cx="34" cy="30" r="2.5" fill="#1f1f1f" />
      <circle cx="46" cy="30" r="2.5" fill="#1f1f1f" />
      <!-- Smile -->
      <path d="M34,36 Q40,42 46,36" fill="none" stroke="#1f1f1f" stroke-width="2" stroke-linecap="round" />
    </svg>
  `,
  styles: [`
    :host {
      display: inline-block;
      width: 48px;
      height: 48px;
    }

    .coach-avatar-svg {
      width: 100%;
      height: 100%;
    }
  `]
})
export class CoachAvatarComponent {}
