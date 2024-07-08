const should = require("should");
const NR_TEST_UTILS = require("nr-test-utils");
const { Group } = NR_TEST_UTILS.require("@node-red/runtime/lib/flows/Group");

describe('Group', function () {
    describe('getSetting', function () {
        it("returns group name/id", async function () {
            const group = new Group({
                getSetting: v => v+v
            }, {
                name: "g1",
                id: "group1"
            })
            await group.start()

            group.getSetting("NR_GROUP_NAME").should.equal("g1")
            group.getSetting("NR_GROUP_ID").should.equal("group1")
        })
        it("returns cloned env var property", async function () {
            const group = new Group({
                getSetting: v => v+v
            }, {
                name: "g1",
                id: "group1",
                env: [
                    {
                        name: 'jsonEnvVar',
                        type: 'json',
                        value: '{"a":1}'
                    }
                ]
            })
            await group.start()
            const result = group.getSetting('jsonEnvVar')
            result.should.have.property('a', 1)
            result.a = 2
            result.b = 'hello'

            const result2 = group.getSetting('jsonEnvVar')
            result2.should.have.property('a', 1)
            result2.should.not.have.property('b')

        })
        it("delegates to parent if not found", async function () {
            const group = new Group({
                getSetting: v => v+v
            }, {
                name: "g1",
                id: "group1"
            })
            await group.start()

            group.getSetting("123").should.equal("123123")
        })
        it("delegates to parent if explicit requested", async function () {
            const parentGroup = new Group({
                getSetting: v => v+v
            }, {
                name: "g0",
                id: "group0"
            })
            const group = new Group(parentGroup, {
                name: "g1",
                id: "group1"
            })
            await parentGroup.start()
            await group.start()

            group.getSetting("$parent.NR_GROUP_NAME").should.equal("g0")
            group.getSetting("$parent.NR_GROUP_ID").should.equal("group0")
        })
    })
})
