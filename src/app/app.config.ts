import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService, TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './auth.interceptor';

/** Loads translation JSON from /i18n/<lang>.json (public/ is the asset root). */
export class HttpTranslateLoader implements TranslateLoader {
  constructor(private readonly http: HttpClient) {}
  getTranslation(lang: string): Observable<TranslationObject> {
    return this.http.get<TranslationObject>(`./i18n/${lang}.json`);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTranslateService({
      fallbackLang: 'uk',
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) => new HttpTranslateLoader(http),
        deps: [HttpClient],
      },
    }),
  ],
};
