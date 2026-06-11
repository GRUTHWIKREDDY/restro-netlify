import serverless from 'serverless-http';
import { configureApp } from '../../server';

let handler: any;

export const handlerFn = async (event: any, context: any) => {
  // Clear event path if it has /api prefix, so express routing works as expected
  // e.g. /api/restaurants -> /restaurants (if the express app defines /api/... then keep it)
  // Actually, express app in server.ts defines routes starting with /api (e.g. app.get("/api/restaurants"))
  // and some routes NOT starting with /api (e.g. app.post("/kcodeit")).
  // When Netlify redirects /api/* to /.netlify/functions/api, the request path received by the function
  // might be /.netlify/functions/api/... or /api/... depending on netlify config.
  // serverless-http handles the routing mapping automatically based on the request URL.
  
  if (!handler) {
    const app = await configureApp(true);
    handler = serverless(app);
  }
  return handler(event, context);
};

export { handlerFn as handler };
