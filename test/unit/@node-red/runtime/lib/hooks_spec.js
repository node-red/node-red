const should = require("should");
const NR_TEST_UTILS = require("nr-test-utils");

const hooks = NR_TEST_UTILS.require("@node-red/runtime/lib/hooks");

describe("runtime/hooks", function() {
    afterEach(function() {
        hooks.clear();
    })
    it("allows a hook to be registered", function(done) {
        let calledWith = null;
        hooks.has("onSend").should.be.false();
        hooks.add("onSend", function(payload) { calledWith = payload } )
        hooks.has("onSend").should.be.true();
        let data = { a: 1 };
        hooks.trigger("onSend",data,err => {
            calledWith.should.equal(data);
            done(err);
        })
    })
    it("rejects invalid hook id", function(done) {
        try {
            hooks.add("foo", function(payload) {})
            done(new Error("Invalid hook accepted"))
        } catch(err) {
            done();
        }
    })
    it("calls hooks in the order they were registered", function(done) {
        hooks.add("onSend", function(payload) { payload.order.push("A") } )
        hooks.add("onSend", function(payload) { payload.order.push("B") } )
        let data = { order:[] };
        hooks.trigger("onSend",data,err => {
            data.order.should.eql(["A","B"])
            done(err);
        })
    })

    it("does not allow multiple hooks with same id.label", function() {
        hooks.has("onSend.one").should.be.false();
        hooks.has("onSend").should.be.false();
        hooks.add("onSend.one", function(payload) { payload.order.push("A") } );
        hooks.has("onSend.one").should.be.true();
        hooks.has("onSend").should.be.true();
        (function() {
            hooks.add("onSend.one", function(payload) { payload.order.push("B") } )
        }).should.throw();
    })

    it("removes labelled hook", function(done) {
        hooks.has("onSend.A").should.be.false();
        hooks.has("onSend.B").should.be.false();
        hooks.has("onSend").should.be.false();

        hooks.add("onSend.A", function(payload) { payload.order.push("A") } )

        hooks.has("onSend.A").should.be.true();
        hooks.has("onSend.B").should.be.false();
        hooks.has("onSend").should.be.true();

        hooks.add("onSend.B", function(payload) { payload.order.push("B") } )

        hooks.has("onSend.A").should.be.true();
        hooks.has("onSend.B").should.be.true();
        hooks.has("onSend").should.be.true();

        hooks.remove("onSend.A");

        hooks.has("onSend.A").should.be.false();
        hooks.has("onSend.B").should.be.true();
        hooks.has("onSend").should.be.true();


        let data = { order:[] };
        hooks.trigger("onSend",data,err => {
            try {
                data.order.should.eql(["B"])

                hooks.remove("onSend.B");

                hooks.has("onSend.A").should.be.false();
                hooks.has("onSend.B").should.be.false();
                hooks.has("onSend").should.be.false();
                
                done(err);
            } catch(err2) {
                done(err2);
            }
        })
    })

    it("cannot remove unlabelled hook", function() {
        hooks.add("onSend", function(payload) { payload.order.push("A") } );
        (function() {
            hooks.remove("onSend")
        }).should.throw();
    })
    it("removes all hooks with same label", function(done) {
        hooks.add("onSend.A", function(payload) { payload.order.push("A") } )
        hooks.add("onSend.B", function(payload) { payload.order.push("B") } )
        hooks.add("preRoute.A", function(payload) { payload.order.push("C") } )
        hooks.add("preRoute.B", function(payload) { payload.order.push("D") } )

        let data = { order:[] };
        hooks.trigger("onSend",data,err => {
            data.order.should.eql(["A","B"])
            hooks.trigger("preRoute", data, err => {
                data.order.should.eql(["A","B","C","D"])

                data.order = [];

                hooks.remove("*.A");

                hooks.trigger("onSend",data,err => {
                    data.order.should.eql(["B"])
                    hooks.trigger("preRoute", data, err => {
                        data.order.should.eql(["B","D"])
                    })
                    done(err);
                })
            })
        })
    })


    it("halts execution on return false", function(done) {
        hooks.add("onSend.A", function(payload) { payload.order.push("A"); return false } )
        hooks.add("onSend.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("onSend",data,err => {
            data.order.should.eql(["A"])
            err.should.be.false();
            done();
        })
    })
    it("halts execution on thrown error", function(done) {
        hooks.add("onSend.A", function(payload) { payload.order.push("A"); throw new Error("error") } )
        hooks.add("onSend.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("onSend",data,err => {
            data.order.should.eql(["A"])
            should.exist(err);
            err.should.not.be.false()
            done();
        })
    })

    it("handler can use callback function", function(done) {
        hooks.add("onSend.A", function(payload, done) {
            setTimeout(function() {
                payload.order.push("A")
                done()
            },30)
        })
        hooks.add("onSend.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("onSend",data,err => {
            data.order.should.eql(["A","B"])
            done(err);
        })
    })

    it("handler can use callback function - halt execution", function(done) {
        hooks.add("onSend.A", function(payload, done) {
            setTimeout(function() {
                payload.order.push("A")
                done(false)
            },30)
        })
        hooks.add("onSend.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("onSend",data,err => {
            data.order.should.eql(["A"])
            err.should.be.false()
            done();
        })
    })
    it("handler can use callback function - halt on error", function(done) {
        hooks.add("onSend.A", function(payload, done) {
            setTimeout(function() {
                done(new Error("test error"))
            },30)
        })
        hooks.add("onSend.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("onSend",data,err => {
            data.order.should.eql([])
            should.exist(err);
            err.should.not.be.false()
            done();
        })
    })

    it("handler be an async function", function(done) {
        hooks.add("onSend.A", async function(payload) {
            return new Promise(resolve => {
                setTimeout(function() {
                    payload.order.push("A")
                    resolve()
                },30)
            });
        })
        hooks.add("onSend.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("onSend",data,err => {
            data.order.should.eql(["A","B"])
            done(err);
        })
    })

    it("handler be an async function - halt execution", function(done) {
        hooks.add("onSend.A", async function(payload) {
            return new Promise(resolve => {
                setTimeout(function() {
                    payload.order.push("A")
                    resolve(false)
                },30)
            });
        })
        hooks.add("onSend.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("onSend",data,err => {
            data.order.should.eql(["A"])
            done(err);
        })
    })
    it("handler be an async function - halt on error", function(done) {
        hooks.add("onSend.A", async function(payload) {
            return new Promise((resolve,reject) => {
                setTimeout(function() {
                    reject(new Error("test error"))
                },30)
            });
        })
        hooks.add("onSend.B", function(payload) { payload.order.push("B") } )

        let data = { order:[] };
        hooks.trigger("onSend",data,err => {
            data.order.should.eql([])
            should.exist(err);
            err.should.not.be.false()
            done();
        })
    })
});
