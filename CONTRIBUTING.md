# Contributing to Node-RED

We welcome contributions, but request you follow these guidelines.

 - [Raising issues](#raising-issues)
 - [Feature requests](#feature-requests)
 - [Pull-Requests](#pull-requests)
   - [Contributor License Agreement](#contributor-license-agreement)

This project adheres to the [Contributor Covenant 1.4](http://contributor-covenant.org/version/1/4/).
By participating, you are expected to uphold this code. Please report unacceptable
behavior to the project's core team at team@nodered.org.

## Raising issues

Please raise any bug reports on the relevant project's issue tracker. Be sure to
search the list to see if your issue has already been raised.

If your issue is more of a question on how to do something with Node-RED, please
consider using the [community forum](https://discourse.nodered.org/).

A good bug report is one that make it easy for us to understand what you were
trying to do and what went wrong.

Provide as much context as possible so we can try to recreate the issue.
If possible, include the relevant part of your flow. To do this, select the
relevant nodes, press Ctrl-E and copy the flow data from the Export dialog.

At a minimum, please include:

 - Version of Node-RED - either release number if you downloaded a zip, or the first few lines of `git log` if you are cloning the repository directly.
 - Version of Node.js - what does `node -v` say?

## Feature requests

For feature requests, please raise them on the [forum](https://discourse.nodered.org).

## Pull-Requests

If you want to raise a pull-request with a new feature, or a refactoring
of existing code, please come and discuss it with us first. We prefer to
do it that way to make sure your time and effort is well spent on something
that fits with our goals.

If you've got a bug-fix or similar for us, then you are most welcome to
get it raised - just make sure you link back to the issue it's fixing and
try to include some tests!

All contributors need to sign the OpenJS Foundation's Contributor License Agreement.
It is an online process and quick to do. If you raise a pull-request without
having signed the CLA, you will be prompted to do so automatically.

### Code Branches

When raising a PR for a fix or a new feature, it is important to target the right branch.

 - `master` - this is the main branch for the latest stable release of Node-RED. All bug fixes for that release should target this branch.
 - `v1.x` - this is the maintenance branch for the 1.x stream. If a fix *only* applies to 1.x, then it should target this branch. If it applies to the current stable release as well, target `master` first. We will then decide if it needs to be back ported to the 1.x stream.
 - `dev` - this is the branch for new feature development targeting the next milestone release.

### Coding standards

Please ensure you follow the coding standards used through-out the existing
code base. Some basic rules include:

 - all files must have the Apache license in the header.
 - indent with 4-spaces, no tabs. No arguments.
 - opening brace on same line as `if`/`for`/`function` and so on, closing brace
 on its own line.
