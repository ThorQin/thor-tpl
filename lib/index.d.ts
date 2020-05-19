interface CompileOptions {
	useAsync?: boolean;
	trace?: TraceFunction;
	fn?: {
		[key: string]: Function;
	};
}
interface TraceFunction {
	(fn: Function, options: CompileOptions): void;
}
interface CompiledFunction {
	(
		data?: any,
		fn?: {
			[key: string]: Function;
		} | null
	): string | Promise<string>;
}
/**
 * Render page asyncronizilly
 * @param {string|CompiledFunction} template
 * @param {any} data
 * @param {any} options
 */
export declare function renderAsync(
	template: string | CompiledFunction,
	data?: any,
	options?: CompileOptions
): Promise<string>;
/**
 * Render page
 * @param {string|CompiledFunction} template
 * @param {any} data
 * @param {any} options
 */
export declare function render(
	template: string | CompiledFunction,
	data?: any,
	options?: CompileOptions
): string | Promise<string>;
/**
 * Compile template function
 * @param {string} template Template definition string
 * @param {CompileOptions} options Available options are 'useAsync' default false,
 * 	'trace' function default null
 */
export declare function compile(template: string, options?: CompileOptions): CompiledFunction;
declare const _default: {
	render: typeof render;
	renderAsync: typeof renderAsync;
	compile: typeof compile;
};
export default _default;
