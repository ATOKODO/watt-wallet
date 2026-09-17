import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { isTauri } from '@tauri-apps/api/core';
import { AppComponent } from './app/app';
bootstrapApplication(AppComponent, {
  providers: [
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && !isTauri(),
      registrationStrategy: 'registerImmediately',
    }),
  ],
}).catch(console.error);
