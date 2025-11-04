<p align="center"> 
  <a href="https://opensource.org/license/apache-2-0"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?color=3F51B5&style=for-the-badge&label=License&logoColor=000000&labelColor=ececec" alt="License: Apache 2.0"></a>
  <a href="https://github.com/node-red/node-red/actions?query=branch%3Amaster">
    <img src="https://img.shields.io/github/actions/workflow/status/node-red/node-red/tests.yml?branch=master&label=Build%20Status&style=for-the-badge" alt="Build Status"/>
  </a>
  <br/>
  <br/>
  <a href="https://discourse.nodered.org">
    <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdiscourse.nodered.org%2Fabout.json&query=%24.about.stats.users_count&suffix=%20members&label=Forum&logo=discourse&style=for-the-badge&color=0e76b2&logoColor=0e76b2&labelColor=ececec" alt="Node-RED Forum on Discourse"/>
  </a>
  <a href="https://github.com/node-red">
    <img src="https://img.shields.io/badge/dynamic/json?url=https://api.github.com/orgs/node-red&query=$.followers&suffix=%20followers&label=GitHub%20org&style=for-the-badge&logo=github&logoColor=24292F&labelColor=ececec&color=24292F" alt="Node-RED GitHub Organisation Followers"/>
  </a>
  <a href="https://nodered.org/slack">
      <img src="https://img.shields.io/badge/Slack-Join%20Us-4A154B.svg?logo=slack&style=for-the-badge&logoColor=4A154B&labelColor=ececec" alt="Slack"/>
  </a>
  <br/>
  <br/>
</p>

<p align="center">
<img src="https://nodered.org/about/resources/media/node-red-icon-2.svg" width="200" title="Node-RED Logo">
</p>
<h3 align="center">Low-code programming for event-driven applications</h3>
<br/>
<p align="center">
<a href="https://flows.nodered.org/search?type=node">
  <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fflows.nodered.org%2Fthings%3Fformat%3Djson%26per_page%3D1%26type%3Dnode&query=$.meta.results.count&label=Nodes&style=for-the-badge&labelColor=ececec&color=8f0000" alt="Node-RED Library Nodes"/>
</a>
<a href="https://flows.nodered.org/search?type=flow">
  <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fflows.nodered.org%2Fthings%3Fformat%3Djson%26per_page%3D1%26type%3Dflow&query=$.meta.results.count&label=Flows&style=for-the-badge&labelColor=ececec&color=8f0000" alt="Node-RED Library Flows"/>
</a>
<a href="https://flows.nodered.org/search?type=collection">
  <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fflows.nodered.org%2Fthings%3Fformat%3Djson%26per_page%3D1%26type%3Dcollection&query=$.meta.results.count&label=Collections&style=for-the-badge&labelColor=ececec&color=8f0000" alt="Node-RED Library Collections"/>
</a>
</p>
<br/>
<a href="https://nodered.org/">
<img src="https://nodered.org/images/node-red-screenshot.png" title="Node-RED: Low-code programming for event-driven applications">
</a>
<br/>

## Quick Start

Check out https://nodered.org/docs/getting-started/ for full instructions on getting
started.

1. `sudo npm install -g --unsafe-perm node-red`
2. `node-red`
3. Open <http://localhost:1880>

<br/>

> [!NOTE]
> More documentation can be found [here](https://nodered.org/docs). For further help, or general discussion, please join the [Node-RED Forum](https://discourse.nodered.org) or [Node-RED Slack](https://nodered.org/slack).

## Links

- [Documentation ↗](https://nodered.org/docs/)
- [About ↗](https://nodered.org/about/)
- [Installation ↗](https://nodered.org/#get-started)
- [Node-RED Library ↗](https://flows.nodered.org/)
  - [Custom Nodes & Integrations ↗](https://flows.nodered.org/search?type=node)
  - [Shared Flows ↗](https://flows.nodered.org/search?type=flow)
  - [Node Collections ↗](https://flows.nodered.org/search?type=collection)
- [Development](#development)
- [Contributing](#contributing)
- [Copyright and license](#copyright-and-license)

## Development

If you want to run the latest code from git, here's how to get started:

1. Clone the code:

        git clone https://github.com/node-red/node-red.git
        cd node-red

2. Install the node-red dependencies

        npm install

3. Build the code

        npm run build

4. Run

        npm start

## Contributing

Before raising a pull-request, please read our [contributing guide](https://github.com/node-red/node-red/blob/master/CONTRIBUTING.md).

This project adheres to the [Contributor Covenant 1.4](http://contributor-covenant.org/version/1/4/). By participating, you are expected to uphold this code. Please report unacceptable behavior to any of the project's core team at team@nodered.org.

### Star history

<a href="https://star-history.com/#node-red/node-red&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=node-red/node-red&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=node-red/node-red&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=node-red/node-red&type=Date" width="100%" />
 </picture>
</a>

### Contributors

It is maintained by:

 * Nick O'Leary [@knolleary](http://twitter.com/knolleary)
 * Dave Conway-Jones [@ceejay](http://twitter.com/ceejay)
 * And many others:

<a href="https://github.com/node-red/node-red/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=node-red/node-red" width="100%"/>
</a>

## Copyright and License

Node-RED is a project of the [OpenJS Foundation](http://openjsf.org). Copyright OpenJS Foundation and other contributors, https://openjsf.org under [the Apache 2.0 license](LICENSE).

<br/>
<a href="http://openjsf.org">
<img src="https://raw.githubusercontent.com/node-red/community-survey/refs/heads/main/public/openjs-foundation-logo.svg" width="240" title="OpenJS Foundation Logo">
</a>
