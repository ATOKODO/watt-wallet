import { Component, input } from '@angular/core';
const paths: Record<string, string> = {
  bolt: 'm13 2-9 12h7l-1 8 10-12h-7l1-8Z',
  home: 'm3 10 9-7 9 7v10H3V10Z M9 20v-7h6v7',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  chevron: 'm8 4 8 8-8 8',
  check: 'm5 12 4 4L19 6',
  leaf: 'M20 3C9 1 2 7 5 16c8 7 17 0 15-13ZM4 21 16 8',
  settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  box: 'm12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v9',
  list: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
  grid: 'M3 3h7v7H3V3ZM14 3h7v7h-7V3ZM3 14h7v7H3v-7ZM14 14h7v7h-7v-7Z',
  moon: 'M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z',
  sun: 'M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  copy: 'M8 8h13v13H8V8ZM16 8V3H3v13h5',
  trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
  chart: 'M4 3v18h17M8 16v-5M13 16V7M18 16V4',
  compare: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
  bulb: 'M9 18h6M10 22h4M8 14c-5-5-1-12 4-12s9 7 4 12l-1 2H9l-1-2Z',
  radiator: 'M4 7h16v13H4V7ZM8 7v13M12 7v13M16 7v13M5 3v1M12 3v1M19 3v1',
  ac: 'M3 4h18v8H3V4ZM6 9h12M7 16v4M12 15v7M17 16v4',
  boiler: 'M6 5a6 3 0 0 1 12 0v13a6 3 0 0 1-12 0V5ZM9 21v2M15 21v2M10 8h4',
  fridge: 'M5 2h14v20H5V2ZM5 9h14M8 5v1M8 12v4',
  freezer: 'M3 7h18v13H3V7ZM3 11h18M9 14h6M5 20v2M19 20v2',
  tv: 'M2 4h20v13H2V4ZM12 17v4M8 21h8',
  pc: 'M2 5h13v10H2V5ZM8 15v4M4 19h8M18 3h5v18h-5V3ZM20 7h1M20 17h1',
  laptop: 'M5 3h14v13H5V3ZM2 20l3-4h14l3 4H2Z',
  router: 'M3 12h18v8H3v-8ZM6 12V4M18 12V4M7 16h.1M11 16h.1',
  washer: 'M4 2h16v20H4V2ZM4 7h16M7 4h.1M17 14a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  dishwasher: 'M4 2h16v20H4V2ZM4 7h16M8 4h5M8 11v7M12 11v7M16 11v7',
  oven: 'M3 3h18v18H3V3ZM3 8h18M7 12h10v6H7v-6ZM7 5h.1M12 5h.1M17 5h.1',
  hob: 'M2 4h20v16H2V4ZM10 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0M18 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0M16 8h.1M8 16h.1',
  reset: 'M3 10a9 9 0 1 1 2 9M3 4v6h6',
  minus: 'M5 12h14',
  move: 'M12 2v20M2 12h20m-13-7 3-3 3 3m-6 14 3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3',
  info: 'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  edit: 'm16 3 5 5L8 21H3v-5L16 3ZM13 6l5 5',
  save: 'M3 3h15l3 3v15H3V3ZM7 3v6h10V3M7 21v-8h10v8',
};
@Component({
  selector: 'ww-icon',
  standalone: true,
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path()"/></svg>',
  styles: [
    ':host{display:inline-flex;width:20px;height:20px;flex-shrink:0;vertical-align:middle}svg{width:100%;height:100%}',
  ],
})
export class IconComponent {
  name = input('bolt');
  path() {
    return paths[this.name()] ?? paths['box'];
  }
}
