import { Plugin } from 'rollup';
export interface IPluginOptions {
    file?: string;
    dir?: string;
}
type RollupPluginZip = (options?: IPluginOptions) => Plugin;
export declare const zip: RollupPluginZip;
export default zip;
