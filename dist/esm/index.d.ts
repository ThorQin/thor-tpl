export interface CompileOptions {
	useAsync?: boolean;
	trace?: TraceFunction;
	fn?: {
		[key: string]: Function;
	};
}
export interface TraceFunction {
	(fn: Function, options: CompileOptions): void;
}
export interface CompiledFunction {
	(
		data?: unknown,
		fn?: {
			[key: string]: Function;
		} | null
	): string | Promise<string>;
}
/**
 * Compile template function
 * @param {string} template Template definition string
 * @param {CompileOptions} options Available options are 'useAsync' default false,
 * 	'trace' function default null
 */
export declare function compile(template: string, options?: CompileOptions): CompiledFunction;
/**
 * Render page asyncronizilly
 * @param {string|CompiledFunction} template
 * @param {any} data
 * @param {any} options
 */
export declare function renderAsync(
	template: string | CompiledFunction,
	data?: unknown,
	options?: CompileOptions
): Promise<string>;
/**
 * Render page
 * @param {string|CompiledFunction} template
 * @param {any} data
 * @param {any} options
 */
export declare function render(template: string | CompiledFunction, data?: unknown, options?: CompileOptions): string;
declare const _default: {
	render: typeof render;
	renderAsync: typeof renderAsync;
	compile: typeof compile;
};
export default _default;
