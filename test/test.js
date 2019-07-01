const tpl = require('..');
const fs = require('fs').promises;
const path = require('path');

async function loadPage(file, data, options) {
	let env = {
		fn: options.fn,
		trace: (func) => {
			save(`build/${file}.js`, func);
		},
	};
	let text = await fs.readFile(path.join(__dirname, file));
	return await tpl.renderAsync(text.toString(), data, env);
}

async function save(file, content) {
	try {
		await fs.stat('build');
	} catch (e) {
		if (e.code === 'ENOENT') {
			await fs.mkdir('build');
		} else {
			throw e;
		}
	}
	await fs.writeFile(file, content);
}

test('Test render page', async () => {
	let data =  {
		persons: ['zhangsan', 'lisi'],
		projects: ['beijing', 'shanghai'],
		flag: 400
	};
	let options = {
		fn: {
			range: (min, max) => {
				if (!max) {
					max = min;
					min = 1;
				}
				var arr = [];
				for (let i = min; i <= max; i++) {
					arr.push(i);
				}
				return arr;
			},
			include: async (file, data, /* fn */) => {
				return await loadPage(file, data, options);
			}
		},

	};
	let html = await loadPage('person.html', data, options);
	await save('build/out.html', html);
});
