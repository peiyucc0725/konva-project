// place at : deploy/ghpages.js
// you can see more info at https://github.com/tschaub/gh-pages
import ghpages from 'gh-pages'
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const options = {
    branch: 'gh-pages',
    repo: 'git@github.com:peiyucc0725/konva-project.git' // project github repo
};

const callback = err => {
    if (err) console.error(err);
    else console.log('publish success');
};

/**
 * This task pushes to the `master` branch of the configured `repo`.
 */
ghpages.publish(path.resolve(__dirname, './dist'), options, callback);
