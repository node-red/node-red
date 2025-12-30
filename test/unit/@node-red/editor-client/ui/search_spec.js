/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

const should = require("should");
const sinon = require("sinon");

const NR_TEST_UTILS = require("nr-test-utils");

// Path to the search.js module
const searchModulePath = NR_TEST_UTILS.resolve(
  "@node-red/editor-client/src/js/ui/search.js"
);

describe("editor-client/ui/search", function () {
  let search;
  let mockRED;

  beforeEach(function () {
    // Set up minimal RED global mock - only what's needed for tests
    mockRED = {
      utils: {
        getNodeLabel: sinon.stub(),
      },
    };
    global.RED = mockRED;

    // Clear require cache to get fresh module instance
    delete require.cache[searchModulePath];
    search = require(searchModulePath);

    // Reset the index for each test
    search._index = {};
  });

  afterEach(function () {
    sinon.restore();
    delete global.RED;
    delete require.cache[searchModulePath];
  });

  describe("indexNode", function () {
    it("preserves original label casing in search results", function () {
      const node = {
        id: "node1",
        type: "tab",
        _def: { category: "config" },
      };
      mockRED.utils.getNodeLabel.returns("MyFlow Name");

      search._indexNode(node);

      // Verify the index key is lowercase (for case-insensitive searching)
      should.exist(search._index["myflow name"]);

      // Verify the stored label preserves original casing
      search._index["myflow name"]["node1"].label.should.equal("MyFlow Name");
    });

    it("indexes node with mixed case label correctly", function () {
      const node = {
        id: "node2",
        type: "subflow",
        _def: { category: "subflows" },
      };
      mockRED.utils.getNodeLabel.returns("MySubFlow_Test");

      search._indexNode(node);

      // Index key should be lowercase
      should.exist(search._index["mysubflow_test"]);

      // Label should preserve original casing
      search._index["mysubflow_test"]["node2"].label.should.equal(
        "MySubFlow_Test"
      );
    });

    it("handles uppercase labels", function () {
      const node = {
        id: "node3",
        type: "tab",
        _def: { category: "config" },
      };
      mockRED.utils.getNodeLabel.returns("UPPERCASE FLOW");

      search._indexNode(node);

      should.exist(search._index["uppercase flow"]);
      search._index["uppercase flow"]["node3"].label.should.equal(
        "UPPERCASE FLOW"
      );
    });

    it("handles lowercase labels", function () {
      const node = {
        id: "node4",
        type: "tab",
        _def: { category: "config" },
      };
      mockRED.utils.getNodeLabel.returns("lowercase flow");

      search._indexNode(node);

      should.exist(search._index["lowercase flow"]);
      search._index["lowercase flow"]["node4"].label.should.equal(
        "lowercase flow"
      );
    });

    it("stores node reference correctly", function () {
      const node = {
        id: "node5",
        type: "tab",
        _def: { category: "config" },
      };
      mockRED.utils.getNodeLabel.returns("Test Flow");

      search._indexNode(node);

      search._index["test flow"]["node5"].node.should.equal(node);
    });

    it("handles nodes without labels by falling back to id", function () {
      const node = {
        id: "node6",
        type: "tab",
        _def: { category: "config" },
      };
      mockRED.utils.getNodeLabel.returns(null);

      search._indexNode(node);

      // When there's no label from getNodeLabel,
      // the node is still indexed by its id
      should.exist(search._index["node6"]);
      search._index["node6"]["node6"].label.should.equal("node6");
    });
  });

  describe("search", function () {
    it("finds nodes with case-insensitive search", function () {
      // Manually set up index with mixed case labels
      search._index = {
        myflow: {
          node1: {
            node: { id: "node1", type: "tab", _def: { category: "config" } },
            label: "MyFlow",
          },
        },
      };

      // Search with lowercase should find the node
      const results = search.search("myflow");
      results.length.should.equal(1);
      results[0].label.should.equal("MyFlow");
    });

    it("returns preserved casing in search results", function () {
      search._index = {
        "test subflow": {
          node1: {
            node: {
              id: "node1",
              type: "subflow",
              _def: { category: "subflows" },
            },
            label: "Test SubFlow",
          },
        },
      };

      const results = search.search("test");
      results.length.should.equal(1);
      results[0].label.should.equal("Test SubFlow");
    });
  });
});
