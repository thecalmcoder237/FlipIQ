import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { EDIT_MODE_STYLES, POPUP_STYLES } from './visual-editor-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

export default function inlineEditDevPlugin() {
	return {
		name: 'vite:inline-edit-dev',
		apply: 'serve',
		transformIndexHtml() {
			const scriptPath = resolve(__dirname, 'edit-mode-script.js');
			let scriptContent = readFileSync(scriptPath, 'utf-8');
			// Inline POPUP_STYLES so the script works on any route (relative import would 404 on e.g. /project-management/deal)
			const escaped = POPUP_STYLES.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
			scriptContent = scriptContent.replace(
				/import\s*\{\s*POPUP_STYLES\s*\}\s*from\s*["'].*["']\s*;\s*\n?/,
				`const POPUP_STYLES = \`${escaped}\`;\n`
			);

			return [
				{
					tag: 'script',
					attrs: { type: 'module' },
					children: scriptContent,
					injectTo: 'body'
				},
				{
					tag: 'style',
					children: EDIT_MODE_STYLES,
					injectTo: 'head'
				}
			];
		}
	};
}
