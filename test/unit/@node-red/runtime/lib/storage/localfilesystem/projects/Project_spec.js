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

    describe("load", function() {
        beforeEach(async function() {
            await fs.remove(userDir);
            await fs.ensureDir(projectDir);
            writeFile("README.md","# test\n");
            Projects.init(mockSettings, mockRuntime);
        });

        afterEach(async function() {
            await fs.remove(userDir);
        });

        function writePackage(settings) {
            writeFile("package.json",JSON.stringify({
                name: "test-project",
                "node-red": { settings: settings }
            }));
        }

        it("uses flow and credentials files inside the project", async function() {
            writePackage({ flowFile: "flows.json", credentialsFile: "flows_cred.json" });
            var project = await Projects.load(projectDir);
            project.getFlowFile().should.eql(path.join(projectDir,"flows.json"));
            project.getCredentialsFile().should.eql(path.join(projectDir,"flows_cred.json"));
        });

        it("uses flow and credentials files in a subdirectory of the project", async function() {
            writePackage({ flowFile: "sub/flows.json", credentialsFile: "sub/flows_cred.json" });
            var project = await Projects.load(projectDir);
            project.getFlowFile().should.eql(path.join(projectDir,"sub","flows.json"));
            project.getCredentialsFile().should.eql(path.join(projectDir,"sub","flows_cred.json"));
        });

        it("ignores a flow file outside the project directory", async function() {
            writePackage({ flowFile: "../../settings.js", credentialsFile: "flows_cred.json" });
            var project = await Projects.load(projectDir);
            should.not.exist(project.getFlowFile());
            project.getCredentialsFile().should.eql(path.join(projectDir,"flows_cred.json"));
        });

        it("ignores a credentials file outside the project directory", async function() {
            writePackage({ flowFile: "flows.json", credentialsFile: "../../settings_cred.json" });
            var project = await Projects.load(projectDir);
            project.getFlowFile().should.eql(path.join(projectDir,"flows.json"));
            should.not.exist(project.getCredentialsFile());
        });

        it("ignores files that resolve outside the project via a subdirectory", async function() {
            writePackage({ flowFile: "sub/../../flows.json", credentialsFile: "sub/../../../flows_cred.json" });
            var project = await Projects.load(projectDir);
            should.not.exist(project.getFlowFile());
            should.not.exist(project.getCredentialsFile());
        });

        it("ignores flow and credentials files that are not strings", async function() {
            writePackage({ flowFile: 123, credentialsFile: { a: 1 } });
            var project = await Projects.load(projectDir);
            should.not.exist(project.getFlowFile());
            should.not.exist(project.getCredentialsFile());
        });
    });

    describe("symlinks", function() {
        var outsideFile = path.join(userDir,"secret.txt");
        var project;
        before(function() {
            if (process.platform === "win32") {
                // Creating symlinks on Windows requires extra privileges
                this.skip();
            }
        });
        beforeEach(async function() {
            await fs.remove(userDir);
            await fs.ensureDir(projectDir);
            fs.writeFileSync(outsideFile,"secret");
            writeFile("package.json",JSON.stringify({ name: "test-project" }));
            writeFile("inside.txt","inside");
            Projects.init(mockSettings, mockRuntime);
        });
        afterEach(async function() {
            await fs.remove(userDir);
        });

        it("reads files and symlinks that stay inside the project", async function() {
            await fs.ensureDir(path.join(projectDir,"sub"));
            fs.symlinkSync("inside.txt",path.join(projectDir,"link.txt"));
            fs.symlinkSync("../inside.txt",path.join(projectDir,"sub","link.txt"));
            project = await Projects.load(projectDir);
            (await project.getFile("inside.txt","_")).should.equal("inside");
            (await project.getFile("link.txt","_")).should.equal("inside");
            (await project.getFile("sub/link.txt","_")).should.equal("inside");
        });

        it("rejects reading a symlink that leads outside the project", async function() {
            fs.symlinkSync("../../secret.txt",path.join(projectDir,"relative-link.txt"));
            fs.symlinkSync(outsideFile,path.join(projectDir,"absolute-link.txt"));
            project = await Projects.load(projectDir);
            await project.getFile("relative-link.txt","_").should.be.rejectedWith({code:"invalid_file_name"});
            await project.getFile("absolute-link.txt","_").should.be.rejectedWith({code:"invalid_file_name"});
        });

        it("rejects reading through a symlinked directory that leads outside the project", async function() {
            fs.symlinkSync(userDir,path.join(projectDir,"dir-link"));
            project = await Projects.load(projectDir);
            await project.getFile("dir-link/secret.txt","_").should.be.rejectedWith({code:"invalid_file_name"});
        });

        it("rejects a dangling symlink", async function() {
            fs.symlinkSync(path.join(userDir,"does-not-exist.txt"),path.join(projectDir,"dangling.txt"));
            project = await Projects.load(projectDir);
            await project.checkFile("dangling.txt").should.be.rejectedWith({code:"invalid_file_name"});
            fs.existsSync(path.join(userDir,"does-not-exist.txt")).should.be.false();
        });

        it("allows files that do not exist yet", async function() {
            project = await Projects.load(projectDir);
            var realPath = await project.checkFile(path.join(projectDir,"new.json"));
            realPath.should.equal(path.join(fs.realpathSync(projectDir),"new.json"));
        });

        it("does not load a README.md that leads outside the project", async function() {
            fs.symlinkSync("../../secret.txt",path.join(projectDir,"README.md"));
            project = await Projects.load(projectDir);
            project.export().description.should.equal("");
        });

        it("does not load a package.json that leads outside the project", async function() {
            fs.writeFileSync(outsideFile,JSON.stringify({ name: "secret", description: "secret" }));
            fs.removeSync(path.join(projectDir,"package.json"));
            fs.symlinkSync("../../secret.txt",path.join(projectDir,"package.json"));
            project = await Projects.load(projectDir);
            should.not.exist(project.export().summary);
        });
    });

    describe("project names", function() {
        beforeEach(async function() {
            await fs.remove(userDir);
            Projects.init(mockSettings, mockRuntime);
        });
        afterEach(async function() {
            await fs.remove(userDir);
        });

        it("rejects loading a project with an unsafe name", async function() {
            for (var name of ["__proto__","constructor","prototype"]) {
                var dir = path.join(projectsDir,name);
                await fs.ensureDir(dir);
                await Projects.load(dir).should.be.rejectedWith({code:"invalid_project_name"});
            }
        });

        it("rejects creating a project with an unsafe name", function() {
            ["__proto__","constructor","prototype"].forEach(function(name) {
                (function() {
                    Projects.create(null, { name: name, path: path.join(projectsDir,name) });
                }).should.throw({code:"invalid_project_name"});
                (function() {
                    Projects.create(null, { name: "sub/"+name, path: path.join(projectsDir,"sub",name) });
                }).should.throw({code:"invalid_project_name"});
            });
            fs.existsSync(projectsDir).should.be.false();
        });

        it("rejects creating a project with a path sensitive name", function() {
            [".", "..", "../escape", "a/../b", "a/./b", "a//b", "a/", "/abs", "a\\..\\..\\b", "a\u0000b", "a\nb"].forEach(function(name) {
                (function() {
                    Projects.create(null, { name: name, path: path.join(projectsDir,name) });
                }).should.throw({code:"invalid_project_name"}, "name: "+JSON.stringify(name));
            });
            fs.existsSync(userDir).should.be.false();
        });

        it("loads projects with valid names", async function() {
            var names = ["my-project","my_project","Project1","my.project","my project",path.join("sub","nested")];
            if (process.platform !== "win32") {
                // Not a valid file name character on Windows
                names.push("my:project");
            }
            for (var name of names) {
                var dir = path.join(projectsDir,name);
                await fs.ensureDir(dir);
                var project = await Projects.load(dir);
                project.name.should.equal(path.basename(name));
            }
        });

        it("rejects loading a project that is not inside the projects directory", async function() {
            await fs.ensureDir(path.join(projectsDir,"sub","__proto__"));
            await Projects.load(userDir).should.be.rejectedWith({code:"invalid_project_name"});
            await Projects.load(path.join(projectsDir,"..")).should.be.rejectedWith({code:"invalid_project_name"});
            await Projects.load(path.join(projectsDir,"sub","..","..")).should.be.rejectedWith({code:"invalid_project_name"});
            await Projects.load(projectsDir).should.be.rejectedWith({code:"invalid_project_name"});
            await Projects.load(path.join(projectsDir,"sub","__proto__")).should.be.rejectedWith({code:"invalid_project_name"});
        });

        it("rejects deleting a project that is not inside the projects directory", async function() {
            await fs.ensureDir(projectsDir);
            await Projects.delete(null, path.join(projectsDir,"..")).should.be.rejectedWith({code:"invalid_project_name"});
            await Projects.delete(null, projectsDir).should.be.rejectedWith({code:"invalid_project_name"});
            fs.existsSync(projectsDir).should.be.true();
        });

        it("rejects deleting a project with an unsafe name", async function() {
            var dir = path.join(projectsDir,"__proto__");
            await fs.ensureDir(dir);
            await Projects.delete(null, dir).should.be.rejectedWith({code:"invalid_project_name"});
            fs.existsSync(dir).should.be.true();
        });
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
