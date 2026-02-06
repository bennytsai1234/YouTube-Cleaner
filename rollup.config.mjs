import { readFileSync } from 'fs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import cleanup from 'rollup-plugin-cleanup';
import metablock from 'rollup-plugin-userscript-metablock';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default {
  input: 'src/main.ts',
  output: {
    file: 'youtube-homepage-cleaner.user.js', // Output to root
    format: 'iife',
    indent: '    ' // Use 4 spaces indentation for readability
  },
  plugins: [
    resolve(),
    typescript(),
    metablock({
      file: './src/meta.json',
      override: {
        version: pkg.version
      }
    }),
    cleanup({
      comments: 'none', // Remove all comments inside code (metablock handles the header)
      extensions: ['js', 'mjs', 'ts']
    })
  ]
};
