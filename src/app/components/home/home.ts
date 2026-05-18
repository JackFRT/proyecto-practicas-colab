import { Component } from '@angular/core';
import { Hero } from '../hero/hero';
import { About } from '../about/about';
import { Catalog } from '../catalog/catalog';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Hero, About, Catalog, Footer],
  template: `
    <app-hero></app-hero>
    <app-about></app-about>
    <app-catalog></app-catalog>
    <app-footer></app-footer>
  `
})
export class Home {}