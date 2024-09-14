import { Plugin } from 'rollup';
export interface IPluginOptions {
    file?: string;
    dir?: string;
}
type RollupPluginZip = (options?: IPluginOptions) => Plugin;
declare const zip: RollupPluginZip;
export default zip;
