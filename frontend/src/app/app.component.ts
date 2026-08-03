import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastHostComponent } from './core/toast.component';

@Component({
  selector: 'mp-root',
  standalone: true,
  imports: [RouterOutlet, ToastHostComponent],
  template: `
    <router-outlet />
    <mp-toast-host />
  `
})
export class AppComponent {}
