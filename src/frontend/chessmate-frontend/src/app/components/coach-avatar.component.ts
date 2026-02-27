import { Component } from '@angular/core';

@Component({
  selector: 'app-coach-avatar',
  standalone: true,
  template: `
    <img src="assets/images/coach.png" alt="Mikhail Stall" class="coach-avatar-img" />
  `,
  styles: [`
    :host {
      display: inline-block;
      width: 100%;
      height: 100%;
    }

    .coach-avatar-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
  `]
})
export class CoachAvatarComponent {}
