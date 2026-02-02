import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { LanguageService } from './core/services/language.service';
import { TranslateModule } from '@ngx-translate/core';
import { SplashScreenComponent } from './shared/components/splash-screen/splash-screen.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule, SplashScreenComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'EOD';

  constructor(private languageService: LanguageService) {}

  async ngOnInit() {
    // Initialize language service (sets saved language)
    this.languageService.getCurrentLanguage();
    
    if (Capacitor.isNativePlatform()) {
      // Configure Status Bar - white background with dark content
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      
      // Configure Keyboard
      Keyboard.setAccessoryBarVisible({ isVisible: false });
      
      // Handle back button on Android
      App.addListener('backButton', () => {
        // Handle back button if needed
      });
    }
  }
}
