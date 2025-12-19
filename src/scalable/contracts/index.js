/**
 * @file contracts/index.js
 * @description Exporta todas as interfaces/contratos do sistema escalável
 */

export { ICacheProvider } from './ICacheProvider.js';
export { ILockProvider } from './ILockProvider.js';
export { IDatabaseProvider } from './IDatabaseProvider.js';
export { IQueueProvider } from './IQueueProvider.js';

export default {
  ICacheProvider: './ICacheProvider.js',
  ILockProvider: './ILockProvider.js',
  IDatabaseProvider: './IDatabaseProvider.js',
  IQueueProvider: './IQueueProvider.js'
};
