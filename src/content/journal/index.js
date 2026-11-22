import { A1, A2, A3, A4 } from './a01-04.js';
import { A5, A6, A7, A8 } from './a05-08.js';
import { A9, A10, A11, A12 } from './a09-12.js';
export const ARTICLE_LIST = [A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12].map((a) => ({ published: true, ...a }));
