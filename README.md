# A Sparkle's Guide to Glitter
> To shine your [alicorn](Phttps://www.merriam-webster.com/dictionary/alicorn) and make it glitter, a [sparkle](https://twitter.com/andyerikson/status/655496264482758660?lang=en) must embrace their destiny

Sparkle's Guide is inspired by [roadmap.sh](https://roadmap.sh) and is a derivative open source work of [node-red](https://github.com/node-red/node-red). This project aims to be a guide to sparkles and unicorns in the [blessing](https://unicornyard.com/what-is-a-group-of-unicorns-called/) on their magical journey to better themselves and each other. 

## Quick Start

Begin by cloning the Sparkles-Guide repository to the machine using SSH (`git clone git@github.com:defenseunicorns/Sparkles-Guide.git`) or HTTPS (`git clone https://github.com/defenseunicorns/Sparkles-Guide.git`). 

After the project has been cloned, run `cd ./Sparkles-Guide` in the terminal in order to change the current working directory to the top level of the project to run the Quick Start commands as shown.

There are two different methods that can be used in order to get the Sparkle's Guide up-and-running quickly once the project has been cloned:

### Local Environment with NPM

Prerequisite: Ensure that node and npm are installed on the machine. [This article provides information on installing both on Mac using Homebrew](https://medium.com/@hayasnc/how-to-install-nodejs-and-npm-on-mac-using-homebrew-b33780287d8f).

1. `npm install`
2. `npm run build`
3. `npm start -- data/flows.json`
4. Open <http://127.0.0.1:1880/>

### Docker/Podman

Prerequisite: Ensure that docker or podman are installed on the machine. [This article provides information on installing Docker on Mac using Docker Desktop/Homebrew](https://www.cprime.com/resources/blog/docker-for-mac-with-homebrew-a-step-by-step-tutorial/). The Homebrew formula for [installing podman on a Mac can be found here](https://formulae.brew.sh/formula/podman).

1. `./container-build.sh`
2. `./container-run.sh`
3. Open <http://127.0.0.1:1880/>

## Contributing

Submit an [issue](https://github.com/defenseunicorns/Sparkles-Guide/issues/new) if unsure.

### To Sparkle Guides

See [this](docs/sparkles-guides-contribution.md) guide, if you are looking to contribute to the guides and flows. 

### To Code

See [this](docs/code-contribution.md) guide, if you are looking to add/remove/modify code implementing Sparkle's Guide.

## Copyright and license

Copyright OpenJS Foundation and other contributors, https://openjsf.org under [the Apache 2.0 license](LICENSE).  
December 2021 --- this project and modifications within it are a derivative work of [node-red](https://github.com/node-red/node-red)
