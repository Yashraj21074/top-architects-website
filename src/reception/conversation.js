import { VisitorContext } from './engine/visitorContext.js';
/** The single in-tab visitor record. The site records which pages are opened (Layout), the reception reads/continues it (Story). Session only; see engine/visitorContext.js. */
export const visitor = new VisitorContext();
