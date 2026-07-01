const path = require('path');
const { task, src, dest } = require('gulp');

// Copies node/credential icons into dist so n8n can render them.
task('build:icons', copyIcons);

function copyIcons() {
	// encoding: false — gulp v5 mangles binary (PNG) files without it.
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');
	src(nodeSource, { allowEmpty: true, encoding: false }).pipe(dest(nodeDestination));

	const credSource = path.resolve('credentials', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');
	return src(credSource, { allowEmpty: true, encoding: false }).pipe(dest(credDestination));
}
