import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonFooter, IonToolbar, IonText } from '@ionic/angular/standalone';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, IonFooter, IonToolbar, IonText],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear: number = new Date().getFullYear();
  appName: string = environment.appName;
  version: string = environment.version;
}