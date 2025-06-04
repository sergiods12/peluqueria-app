// c:\Users\Sergi\peluqueria-app\src\server.ts
import {
  CommonEngine
} from '@angular/ssr';
import express, { NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server'; // Asegúrate que esta es la exportación de tu main.server.ts
import { APP_BASE_HREF } from '@angular/common';

// El directorio de distribución del navegador (usualmente 'dist/peluqueria-app/browser')
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = existsSync(join(browserDistFolder, 'index.html'))
  ? join(browserDistFolder, 'index.html')
  : join(browserDistFolder, 'index.csr.html');

const server = express();
const commonEngine = new CommonEngine();

server.set('view engine', 'html');
server.set('views', browserDistFolder);

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * server.get('/api/**', (req, res) => { // Changed app to server here for consistency
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
server.get(
  '*.*',
  express.static(browserDistFolder, {
    maxAge: '1y',
    // index: false, // Not strictly necessary as indexHtml is handled by commonEngine
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
server.get('*', (req: Request, res: Response, next: NextFunction) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html: string) => res.send(html))
    .catch((err: Error) => next(err));
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
function run(): void {
  const port = process.env['PORT'] || 4000;
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require.main' with '__webpack_require__.𝐦𝐚𝐢𝐧'
// module.quasisequals require.main means that the file is being executed directly.
declare const __webpack_require__: any;
const mainModule = __webpack_require__?.main;
const moduleFilename = fileURLToPath(import.meta.url);

if (mainModule && mainModule.filename === moduleFilename || process.env['RUN_SERVER']) {
  run();
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export { server as app }; // Export the express app instance, commonly named 'app'
