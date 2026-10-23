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

var should = require("should");
var fs = require("fs-extra");
var path = require("path");
var child_process = require("child_process");

var NR_TEST_UTILS = require("nr-test-utils");
var Projects = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/projects/Project");

describe("storage/localfilesystem/projects/Project", function() {
    var userDir = path.join(__dirname,".testUserHome");
    var projectsDir = path.join(userDir,"projects");
    var projectDir = path.join(projectsDir,"test-project");

    var mockSettings = {
        userDir: userDir,
        editorTheme: { projects: {} },
        get: function() { return { projects: {} } },
        set: function() { return Promise.resolve() }
    };
    var mockRuntime = {
        log: { trace: function() {}, warn: function() {}, error: function() {} }
    };

    // Run git against the test project, with the user's own git environment
    // kept out of the way so the fixture is reproducible.
    function git(args, opts) {
        return child_process.execFileSync("git", args, {
            cwd: (opts||{}).cwd || projectDir,
            encoding: "utf8",
            stdio: "pipe",
            env: Object.assign({}, process.env, {
                HOME: userDir,
                USERPROFILE: userDir,
                GIT_CONFIG_NOSYSTEM: "1",
                GIT_TERMINAL_PROMPT: "0"
            })
        });
    }
    function writeFile(file, content) {
        fs.writeFileSync(path.join(projectDir,file), content);
    }
    function readFile(file) {
        return fs.readFileSync(path.join(projectDir,file), "utf8");
    }
    function unmergedFiles() {
        return git(["diff","--name-only","--diff-filter=U"]).split("\n").filter(function(l) { return l !== "" });
    }

    var gitAvailable = false;
    before(function() {
        try {
            child_process.execFileSync("git",["--version"],{stdio:"pipe"});
            gitAvailable = true;
        } catch(err) {
            gitAvailable = false;
        }
    });

    describe("resolveMerge", function() {
        var project;

        beforeEach(async function() {
            if (!gitAvailable) {
                this.skip();
                return;
            }
            this.timeout(20000);
            await fs.remove(userDir);
            await fs.ensureDir(projectDir);

            // A repository mid-merge, with two conflicted files and one that
            // is merely modified.
            git(["init"]);
            git(["config","user.email","nodered@example.com"]);
            git(["config","user.name","Node-RED Test"]);
            git(["config","commit.gpgsign","false"]);
            writeFile("flows.json","base\n");
            writeFile(".gitignore","base\n");
            writeFile("package.json","base\n");
            git(["add","-A"]);
            git(["commit","-m","initial"]);
            var mainBranch = git(["rev-parse","--abbrev-ref","HEAD"]).trim();

            git(["checkout","-b","other"]);
            writeFile("flows.json","theirs\n");
            writeFile(".gitignore","theirs\n");
            git(["commit","-a","-m","theirs"]);

            git(["checkout",mainBranch]);
            writeFile("flows.json","ours\n");
            writeFile(".gitignore","ours\n");
            git(["commit","-a","-m","ours"]);
            writeFile("package.json","modified\n");
            try {
                git(["merge","other"]);
                throw new Error("test fixture did not produce a merge conflict");
            } catch(err) {
                // The merge is expected to fail with conflicts
            }
            unmergedFiles().should.eql([".gitignore","flows.json"]);

            Projects.init(mockSettings, mockRuntime);
            project = await Projects.load(projectDir);
        });

        afterEach(async function() {
            await fs.remove(userDir);
        });

        it("writes the provided content and stages the file", async function() {
            await project.resolveMerge("flows.json","resolved\n");

            readFile("flows.json").should.eql("resolved\n");
            unmergedFiles().should.eql([".gitignore"]);
            git(["status","--porcelain","--","flows.json"]).should.startWith("M ");
        });

        it("applies the selected side of each conflict block", async function() {
            // <<<<<<< HEAD / ours / ======= / theirs / >>>>>>> other
            await project.resolveMerge("flows.json",{
                1: { selection: "A", separator: 3, changeEnd: 5 }
            });

            readFile("flows.json").should.eql("ours\n");
            unmergedFiles().should.eql([".gitignore"]);
        });

        it("applies the other side of each conflict block", async function() {
            await project.resolveMerge("flows.json",{
                1: { selection: "B", separator: 3, changeEnd: 5 }
            });

            readFile("flows.json").should.eql("theirs\n");
        });

        it("resolves a conflicted dot-file whose name begins with .git", async function() {
            // The .git guard must not over-reach to .gitignore/.gitattributes
            await project.resolveMerge(".gitignore","resolved\n");

            readFile(".gitignore").should.eql("resolved\n");
            unmergedFiles().should.eql(["flows.json"]);
        });

        it("rejects a file outside the project directory", function() {
            (function() {
                project.resolveMerge("../escaped.json","hacked\n");
            }).should.throw("Invalid file name");

            fs.existsSync(path.join(projectsDir,"escaped.json")).should.be.false();
        });

        it("rejects a file inside the project's .git directory", function() {
            var before = fs.readFileSync(path.join(projectDir,".git","config"),"utf8");

            (function() {
                project.resolveMerge(".git/config","hacked\n");
            }).should.throw("Invalid file name");
            (function() {
                project.resolveMerge(".git/hooks/pre-commit","hacked\n");
            }).should.throw("Invalid file name");
            (function() {
                // normalises back inside .git
                project.resolveMerge("subdir/../.git/config","hacked\n");
            }).should.throw("Invalid file name");

            fs.readFileSync(path.join(projectDir,".git","config"),"utf8").should.eql(before);
        });

        it("rejects a file inside a nested .git directory", function() {
            (function() {
                project.resolveMerge("subdir/.git/config","hacked\n");
            }).should.throw("Invalid file name");

            fs.existsSync(path.join(projectDir,"subdir")).should.be.false();
        });

        it("rejects a file that is not in conflict", function() {
            return project.resolveMerge("package.json","hacked\n").then(function() {
                throw new Error("resolveMerge should have rejected");
            }).catch(function(err) {
                err.should.have.property("code","git_file_not_unmerged");
                readFile("package.json").should.eql("modified\n");
            });
        });

        it("rejects a file name that git would treat as a pathspec pattern", function() {
            return project.resolveMerge("*","hacked\n").then(function() {
                throw new Error("resolveMerge should have rejected");
            }).catch(function(err) {
                err.should.have.property("code","git_file_not_unmerged");
                fs.existsSync(path.join(projectDir,"*")).should.be.false();
                unmergedFiles().should.eql([".gitignore","flows.json"]);
            });
        });

        it("rejects when the project is not in a merge conflict state", async function() {
            await project.resolveMerge("flows.json","resolved\n");
            await project.resolveMerge(".gitignore","resolved\n");
            git(["commit","-m","merged"]);
            unmergedFiles().should.eql([]);

            try {
                await project.resolveMerge("flows.json","hacked\n");
                throw new Error("resolveMerge should have rejected");
            } catch(err) {
                err.should.have.property("code","git_not_merging");
                readFile("flows.json").should.eql("resolved\n");
            }
        });
    });
});
