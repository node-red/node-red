# Code Contribution

Sparkles guide is forked from Node-red, which has a LOT of functionality in addition to the nice UI we use. As such, much code is not relevant for our purpose. 

Since this is a derivative work, using an Apache 2.0 license. We MUST add a modification copyright to any changed files not originated by us. Add `2022 Modification Copyright - Defense Unicorns` as a comment to the top of any changed file.

Finally, deleting code often has unintended consequences - you should, at a minimum, add cypress tests to confirm basic, common functionality to ensure functionality.

## Running the code

1. `npm install`
2. `npm run dev` # auto load code changes
3. open <https://127.0.0.1:1880>

## Testing code

1. `npm run dev -- data/flows.json` or `npm start -- data/flows.json`
2. `npm run cy:run` # Runs cypress tests

## Updating from upstream

1. Add a reference to upstream `git remote add upstream https://github.com/node-red/node-red.git` (verify with `git remote -v`)
2. Fetch upstream `git fetch upstream`
3. `git checkout master`
4. `git merge upstream/master` # We've found rebasing to be quite difficult, preference is a single merge commit
5. Resolve merge conflicts
6. `git push origin master`