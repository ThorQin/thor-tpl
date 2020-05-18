const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

interface CompileOptions {
	useAsync?: boolean;
	trace?: TraceFunction;
	fn?: { [key: string]: Function };
}

interface TraceFunction {
	(fn: Function, options: CompileOptions): void;
}

interface CompiledFunction {
	(data?: any, fn?: { [key: string]: Function } | null): string | Promise<string>;
}

function getFn(template: string | CompiledFunction, options?: CompileOptions): CompiledFunction {
	if (typeof template === 'function') {
		return template;
	}
	return compile(template, options);
}

/**
 * Render page asyncronizilly
 * @param {string|CompiledFunction} template
 * @param {any} data
 * @param {any} options
 */
export async function renderAsync(template: string | CompiledFunction, data?: any, options?: CompileOptions) {
	if (options instanceof Object) {
		options.useAsync = true;
	} else {
		options = { useAsync: true };
	}
	let fn = getFn(template, options);
	return await fn(data, options ? options.fn : null);
}

/**
 * Render page
 * @param {string|CompiledFunction} template
 * @param {any} data
 * @param {any} options
 */
export function render(template: string | CompiledFunction, data?: any, options?: CompileOptions) {
	if (options instanceof Object) {
		options.useAsync = false;
	} else {
		options = { useAsync: false };
	}
	let fn = getFn(template, options);
	return fn(data, options ? options.fn : null);
}

function error(match: RegExpExecArray, msg: any = 'unexpected command') {
	let newline = /\n/gu;
	let rs;
	let lines = 1;
	while ((rs = newline.exec(match.input)) !== null) {
		if (rs.index < match.index) {
			lines++;
		} else {
			break;
		}
	}
	let message;
	if (msg instanceof Object) {
		message = msg.message;
		lines += msg.lines - 1;
	} else {
		message = `Compile error: ${msg}: '${match[0]}'`;
	}
	throw new Error(`${message} at: line ${lines}`);
}

const CMD_ARG = /^@arg\s+(.+)$/u;
const CMD_FN = /^@fn\s+(.+)$/u;
const CMD_LOOP = /^@loop\s+(?:([_$a-zA-Z][_$a-zA-Z0-9]*)\s*:\s*)?([_$a-zA-Z][_$a-zA-Z0-9]*)\s+of\s+(.+)$/u;
const CMD_END_LOOP = /^@end\s+loop\s*$/u;
const CMD_IF = /^@if\s+(.+)$/u;
const CMD_ELSE_IF = /^@else\s+if\s+(.+)$/u;
const CMD_ELSE = /^@else\s*$/u;
const CMD_END_IF = /^@end\s+if\s*$/u;
const CMD_EXEC = /^@exec\s+(.+)$/u;
const CMD_UNSAFE = /^@unsafe\s+(.+)$/u;

const ID = /^[_$a-zA-Z][_$a-zA-Z0-9]*$/u;

const _SMAP: { [key: string]: string } = {
	'<': '&lt;',
	'>': '&gt;',
	'&': '&amp;',
	'"': '&quot;',
	"'": '&apos;',
};
function _safe(t: any) {
	if (typeof t === 'undefined' || t === null || (typeof t === 'number' && isNaN(t))) return '';
	return (t + '').replace(/<|>|&|'|"/g, (s) => {
		let rs = _SMAP[s];
		return rs || s;
	});
}

/**
 * Compile template function
 * @param {string} template Template definition string
 * @param {CompileOptions} options Available options are 'useAsync' default false,
 * 	'trace' function default null
 */
export function compile(template: string, options?: CompileOptions): CompiledFunction {
	if (typeof template !== 'string') {
		throw new Error('Invalid template!');
	}
	options = options || {};
	let src = '';
	let regex = /\{\{((?:.|[\n\r])+?)\}\}/gm;
	let match;
	let pos = 0;
	let cmdStack: {
		cmd: string;
		match: RegExpExecArray;
	}[] = [];
	let args: string[] = [];
	let fns: string[] = [];
	let level = 1;
	let serial = 0;
	let useSafeText = false;
	function getTempName(name: string) {
		return `_${name}_${++serial}`;
	}
	function lastCmd() {
		return cmdStack.length > 0 ? cmdStack[cmdStack.length - 1].cmd : null;
	}
	function addSpace(offset = 0) {
		let sp = '';
		for (let i = 0; i < level + offset; i++) {
			sp += '\t';
		}
		return sp;
	}
	function addSrcText(str: string) {
		if (!str) {
			return '';
		}
		return `${addSpace()}_src_ += ${JSON.stringify(str)};\n`;
	}
	function addLoop(idx: string, declare: string, exp: string) {
		let arrName = getTempName('a');
		if (!idx) {
			idx = getTempName('i');
		}
		let src = `${addSpace()}let ${arrName} = (${exp});\n`;
		src += `${addSpace()}for (let ${idx} = 0; ${idx} < ${arrName}.length; ${idx}++) {\n`;
		if (declare !== '_') {
			src += `${addSpace(1)}let ${declare} = ${arrName}[${idx}];\n`;
		}
		return src;
	}
	function addIf(exp: string) {
		return `${addSpace()}if (${exp}) {\n`;
	}
	function addElseIf(exp: string) {
		return `${addSpace()}} else if (${exp}) {\n`;
	}
	function addElse() {
		return `${addSpace()}} else {\n`;
	}
	function addEnd() {
		return `${addSpace()}}\n`;
	}
	function addExec(exp: string) {
		return `${addSpace()}${exp};\n`;
	}
	function addSafeText(exp: string) {
		useSafeText = true;
		return `${addSpace()}_src_ += _safe(${exp});\n`;
	}
	function addUnsafeText(exp: string) {
		return `${addSpace()}_src_ += (${exp});\n`;
	}
	function addDeclare(exp: string, match: RegExpExecArray, arr: string[]) {
		let ps = exp.split(',');
		for (let i = 0; i < ps.length; i++) {
			let p = ps[i].trim();
			if (!ID.test(p)) {
				error(match, `Invalid declare variable name: ${p}`);
			}
			if (arr.indexOf(p) >= 0) {
				error(match, `Duplicated declare variable name: ${p}`);
			}
			arr.push(p);
		}
	}

	while ((match = regex.exec(template)) != null) {
		src += addSrcText(template.substring(pos, match.index));
		pos = regex.lastIndex;
		let cmd = match[1].trim();
		let m;
		if (cmd[0] === '#') {
			continue;
		} else if (cmd[0] !== '@') {
			src += addSafeText(cmd);
		} else if ((m = CMD_ARG.exec(cmd)) != null) {
			addDeclare(m[1], match, args);
		} else if ((m = CMD_FN.exec(cmd)) != null) {
			addDeclare(m[1], match, fns);
		} else if ((m = CMD_UNSAFE.exec(cmd)) != null) {
			src += addUnsafeText(m[1]);
		} else if ((m = CMD_EXEC.exec(cmd)) != null) {
			src += addExec(m[1]);
		} else if ((m = CMD_LOOP.exec(cmd)) != null) {
			src += addLoop(m[1], m[2], m[3]);
			cmdStack.push({
				cmd: 'loop',
				match: match,
			});
			level++;
		} else if ((m = CMD_END_LOOP.exec(cmd)) != null) {
			if (lastCmd() === 'loop') {
				cmdStack.pop();
				level--;
				src += addEnd();
			} else {
				error(match);
			}
		} else if ((m = CMD_IF.exec(cmd)) != null) {
			src += addIf(m[1]);
			cmdStack.push({
				cmd: 'if',
				match: match,
			});
			level++;
		} else if ((m = CMD_ELSE_IF.exec(cmd)) != null) {
			let last = lastCmd();
			if (last === 'if' || last === 'elseif') {
				level--;
				src += addElseIf(m[1]);
				level++;
				cmdStack.push({
					cmd: 'elseif',
					match: match,
				});
			} else {
				error(match);
			}
		} else if ((m = CMD_ELSE.exec(cmd)) != null) {
			let last = lastCmd();
			if (last === 'if' || last === 'elseif') {
				level--;
				src += addElse();
				level++;
				cmdStack.push({
					cmd: 'else',
					match: match,
				});
			} else {
				error(match);
			}
		} else if ((m = CMD_END_IF.exec(cmd)) != null) {
			let last = lastCmd();
			if (last === 'if' || last === 'elseif' || last === 'else') {
				while (cmdStack.length > 0 && cmdStack.pop()?.cmd !== 'if');
				level--;
				src += addEnd();
			} else {
				error(match);
			}
		} else {
			error(match, 'invalid command');
		}
	}
	if (cmdStack.length > 0) {
		error(cmdStack[0].match, 'cannot find corresponding close command');
	}
	if (pos < template.length) {
		src += addSrcText(template.substring(pos));
	}
	let Fn = options.useAsync ? AsyncFunction : Function;
	let func = '\t"use strict";\n';
	if (useSafeText) {
		func += `\tconst _SMAP = ${JSON.stringify(_SMAP)};\n`;
		func += _safe.toString().replace(/^/gm, '\t') + '\n';
	}
	func += '\tvar _src_ = "";\n';
	if (args.length > 0) {
		func += `\tvar {${args.join(', ')}} = $data || {};\n`;
	}
	if (args.length > 0) {
		func += `\tvar {${fns.join(', ')}} = $fn || {};\n`;
	}
	func += src;
	func += '\treturn _src_;';
	let fn: CompiledFunction = new Fn('$data', '$fn', func);
	if (options && typeof options.trace === 'function') {
		options.trace(fn, options);
	}
	return fn;
}
