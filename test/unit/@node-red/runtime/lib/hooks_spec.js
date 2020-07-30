const should = require("should");
const NR_TEST_UTILS = require("nr-test-utils");

const hooks = NR_TEST_UTILS.require("@node-red/runtime/lib/hooks");

describe("runtime/hooks", function() {
    afterEach(function() {
        hooks.clear();
    })
    it("allows a hook to be registered", function(done) {
        let calledWith = null;
        should.not.exist(hooks.states.foo);
        hooks.add("foo", function(payload) { calledWith = payload } )
        hooks.states.foo.should.be.true();
        let data = { a: 1 };
        hooks.trigger("foo",data,err => {
            calledWith.should.equal(data);
            done(err);
        })
    })

    it("calls hooks in the order they were registered", function(done) {
        hooks.add("foo", function(payload) { payload.order.push("A") } )
        hooks.add("foo", function(payload) { payload.order.push("B") } )
        let data = { order:[] };
        hooks.trigger("foo",data,err => {
            data.order.should.eql(["A","B"])
            done(err);
        })
    })

    it("does not allow multiple hooks with same id.label", function() {
        hooks.add("foo.one", function(payload) { payload.order.push("A") } );
        (function() {
            hooks.add("foo.one", function(payload) { payload.order.push("B") } )
        }).should.throw();
    })

    it("removes labelled hook", function(done) {
        hooks.add("foo.A", function(payload) { payload.order.push("A") } )
        hooks.add("foo.B", function(payload) { payload.order.push("B") } )

        hooks.remove("foo.A");
        hooks.states.foo.should.be.true();

        let data = { order:[] };
        hooks.trigger("foo",data,err => {
            try {
                data.order.should.eql(["B"])

                hooks.remove("foo.B");
                should.not.exist(hooks.states.foo);

                done(err);
            } catch(err2) {
                done(err2);
            }
        })
    })

    it("cannot remove unlabelled hook", function() {
        hooks.add("foo", function(payload) { payload.order.push("A") } );
        (function() {
            hooks.remove("foo")
        }).should.throw();
    })
    it("removes all hooks with same label", function(done) {
        hooks.add("foo.A", function(payload) { payload.order.push("A") } )
        hooks.add("foo.B", function(payload) { payload.order.push("B") } )
        hooks.add("bar.A", function(payload) { payload.order.push("C") } )
        hooks.add("bar.B", function(payload) { payload.order.push("D") } )

        let data = { order:[] };
        hooks.trigger("foo",data,err => {
            data.order.should.eql(["A","B"])
            hooks.trigger("bar", data, err => {
                data.order.should.eql(["A","B","C","D"])

                data.order = [];

                hooks.remove("*.A");

                hooks.trigger("foo",data,err => {
                    data.order.should.eql(["B"])
                    hooks.trigger("bar", data, err => {
                        data.order.should.eql(["B","D"])
                    })
                    done(err);
                })
            })
        })
    })


    it("halts execution on return false", function(done) {
        hooks.add("foo.A", function(payload) { payload.order.push("A"); return false } )
        hooks.add("foo.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("foo",data,err => {
            data.order.should.eql(["A"])
            err.should.be.false();
            done();
        })
    })
    it("halts execution on thrown error", function(done) {
        hooks.add("foo.A", function(payload) { payload.order.push("A"); throw new Error("error") } )
        hooks.add("foo.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("foo",data,err => {
            data.order.should.eql(["A"])
            should.exist(err);
            err.should.not.be.false()
            done();
        })
    })

    it("handler can use callback function", function(done) {
        hooks.add("foo.A", function(payload, done) {
            setTimeout(function() {
                payload.order.push("A")
                done()
            },30)
        })
        hooks.add("foo.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("foo",data,err => {
            data.order.should.eql(["A","B"])
            done(err);
        })
    })

    it("handler can use callback function - halt execution", function(done) {
        hooks.add("foo.A", function(payload, done) {
            setTimeout(function() {
                payload.order.push("A")
                done(false)
            },30)
        })
        hooks.add("foo.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("foo",data,err => {
            data.order.should.eql(["A"])
            err.should.be.false()
            done();
        })
    })
    it("handler can use callback function - halt on error", function(done) {
        hooks.add("foo.A", function(payload, done) {
            setTimeout(function() {
                done(new Error("test error"))
            },30)
        })
        hooks.add("foo.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("foo",data,err => {
            data.order.should.eql([])
            should.exist(err);
            err.should.not.be.false()
            done();
        })
    })

    it("handler be an async function", function(done) {
        hooks.add("foo.A", async function(payload) {
            return new Promise(resolve => {
                setTimeout(function() {
                    payload.order.push("A")
                    resolve()
                },30)
            });
        })
        hooks.add("foo.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("foo",data,err => {
            data.order.should.eql(["A","B"])
            done(err);
        })
    })

    it("handler be an async function - halt execution", function(done) {
        hooks.add("foo.A", async function(payload) {
            return new Promise(resolve => {
                setTimeout(function() {
                    payload.order.push("A")
                    resolve(false)
                },30)
            });
        })
        hooks.add("foo.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("foo",data,err => {
            data.order.should.eql(["A"])
            done(err);
        })
    })
    it("handler be an async function - halt on error", function(done) {
        hooks.add("foo.A", async function(payload) {
            return new Promise((resolve,reject) => {
                setTimeout(function() {
                    reject(new Error("test error"))
                },30)
            });
        })
        hooks.add("foo.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("foo",data,err => {
            data.order.should.eql([])
            should.exist(err);
            err.should.not.be.false()
            done();
        })
    })
});
