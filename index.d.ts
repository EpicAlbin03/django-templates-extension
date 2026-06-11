import { Config } from 'prettier';

export interface PluginConfig {}

export type PrettierConfig = PluginConfig & Config;
