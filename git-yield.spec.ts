import {
    assert,
} from "https://deno.land/std/testing/asserts.ts";
import { exec, getConflictingBranches } from "./git-yield.ts";

Deno.test("detect merge conflicts with actual git repositories", async () => {
    const repoPath = await Deno.makeTempDir();
    const bareRepoPath = `${repoPath}_bare`;

    try {
        // Create a bare repository that simulates the remote repository.
        await Deno.mkdir(bareRepoPath);
        await exec(["git", "init", "--bare", bareRepoPath]);

        // Clone the bare repository, simulating a local workspace.
        await exec(["git", "clone", bareRepoPath, repoPath]);

        // Change the working directory to the cloned repository.
        Deno.chdir(repoPath);

        // Set up the user configuration for the test environment.
        await exec(["git", "config", "user.email", "you@example.com"]);
        await exec(["git", "config", "user.name", "Your Name"]);

        // Create a test file, add content to it, and commit it to the 'main' branch.
        await Deno.writeTextFile(`${repoPath}/test.txt`, "Initial content\n");
        await exec(["git", "add", "."]);
        await exec(["git", "commit", "-m", "Initial commit"]);

        // Make sure the branch is named 'main' and push it to the remote repository.
        await exec(["git", "branch", "-M", "main"]);
        await exec(["git", "push", "-u", "origin", "main"]);

        // Create a new branch, check it out, modify the test file, and commit the changes.
        await exec(["git", "checkout", "-b", "test-branch"]);
        await Deno.writeTextFile(`${repoPath}/test.txt`, "Content from test-branch\n");
        await exec(["git", "commit", "-am", "Commit in test-branch"]);

        // Push the changes to the new branch to the remote repository.
        await exec(["git", "push", "origin", "test-branch"]);

        // Switch back to the 'main' branch, make a conflicting change, and commit it.
        await exec(["git", "checkout", "main"]);
        await Deno.writeTextFile(`${repoPath}/test.txt`, "Conflicting content from main\n");
        await exec(["git", "commit", "-am", "Commit in main causing conflict"]);

        // Invoke the script function to find conflicting branches.
        const conflictingBranches = await getConflictingBranches("main");

        // Assert that the 'test-branch' is identified as conflicting.
        assert(conflictingBranches.includes("test-branch"));
    } finally {
        // Clean up by removing the directories created during the test.
        await Deno.remove(repoPath, { recursive: true });
        await Deno.remove(bareRepoPath, { recursive: true });
    }
});
