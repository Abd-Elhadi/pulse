import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <div
      style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;"
    >
      <h1 style="font-size:6rem;margin:0;color:#667eea;">404</h1>
      <p style="font-size:1.25rem;color:#666;">Page not found</p>
      <a mat-raised-button color="primary" routerLink="/rooms">Go Home</a>
    </div>
  `,
})
export class NotFoundComponent {}
