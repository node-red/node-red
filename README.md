# Node-RED

A visual tool for wiring the Internet of Things.

![Screenshot](http://nodered.org/images/node-red-screenshot.png "Node-RED: A visual tool for wiring the Internet of Things")

## Quick Start

Check out [INSTALL](INSTALL.md) for full instructions on getting started.

1. download the zip and unzip, or git clone
2. cd node-red
3. npm install
4. node red.js
5. Open <http://localhost:1880>

## Documentation

More documentation can be found [here](http://nodered.org/docs).

For further help, or general discussion, there is also a [mailing list](https://groups.google.com/forum/#!forum/node-red).

## Browser Support

The Node-RED editor runs in the browser. We routinely develop and test using
Chrome and Firefox. We have anecdotal evidence that it works in IE9.

We do not yet support mobile browsers, although that is high on our priority
list.

## Contributing

### Reporting issues

Please raise any bug reports on the project's [issue tracker](https://github.com/node-red/node-red/issues?state=open).
Be sure to search the list to see if your issue has already been raised.

For feature requests, please raise them on the [mailing list](https://groups.google.com/forum/#!forum/node-red)
first.

### Creating new nodes

The plugin nature of Node-RED means anyone can create a new node to extend
its capabilities. 

We want to avoid duplication as that can lead to confusion. Many of our existing
nodes offer a starting point of functionality. If they are missing features,
we would rather extend them than add separate 'advanced' versions. But the key
to that approach is getting the UX right to not lose the simplicity.

We are also going to be quite selective over what nodes are included in the main
repository - enough to be useful, but not so many that new user is overwhelmed.

To contribute a new node, please raise a pull-request against the 
`node-red-nodes` repository.

Eventually, the nodes will be npm-installable, but we're not there yet. We'll
also have some sort of registry of nodes to help with discoverability.

### Pull-Requests

In order for us to accept pull-requests, the contributor must first complete
a Contributor License Agreement (CLA). This clarifies the intellectual 
property license granted with any contribution. It is for your protection as a 
Contributor as well as the protection of IBM and its customers; it does not 
change your rights to use your own Contributions for any other purpose.

Once you have created a pull-request, we'll provide a link to the appropriate
CLA document.

If you are an IBMer, please contact us directly as the contribution process is
slightly different.

## Authors

Node-RED is a creation of the IBM Emerging Technology Services team.

* Nick O'Leary [@knolleary](http://twitter.com/knolleary)
* Dave Conway-Jones [@ceejay](http://twitter.com/ceejay)

## Copyright and license

Copyright 2013 IBM Corp. under [the Apache 2.0 license](LICENSE).
