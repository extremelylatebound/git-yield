const { run, args } = Deno;

export async function exec(command: string[]): Promise<string> {
    const process = run({
        cmd: command,
        stdout: "piped",
        stderr: "piped",
    });

    const [status, stdoutBytes, stderrBytes] = await Promise.all([
        process.status(),
        process.output(),
        process.stderrOutput(),
    ]);
    process.close();

    if (status.code !== 0) {
        const errorString = new TextDecoder().decode(stderrBytes);
        throw new Error(`Command "${command.join(' ')}" failed with error: ${errorString}`);
    }

    return new TextDecoder().decode(stdoutBytes);
}

export async function hasMergeConflicts(branchToCheck: string, branchToCompare: string): Promise<boolean> {
    try {
        await exec(["git", "checkout", branchToCheck]);
        await exec(["git", "stash", "--include-untracked"]);
        await exec(["git", "merge", "--no-commit", "--no-ff", branchToCompare]);

        return false;
    } catch (error) {
        console.log(`Error while checking conflicts between ${branchToCheck} and ${branchToCompare}:`, error.message);
        return true;
    } finally {
        await exec(["git", "merge", "--abort"]).catch(err => console.log(`Error aborting merge: ${err.message}`));
        await exec(["git", "stash", "pop"]).catch(err => console.log(`Error popping stash: ${err.message}`));
        await exec(["git", "checkout", branchToCompare]).catch(err => console.log(`Error checking out ${branchToCompare}: ${err.message}`));
    }
}

export async function getConflictingBranches(baseBranch: string): Promise<string[]> {
    const conflictingBranches: string[] = [];

    // Fetch the latest state of all branches from the remote repository
    await exec(["git", "fetch", "origin"]);

    // Get all remote branches, removing the 'origin/' prefix for standardization
    const remoteBranchesOutput = await exec(["git", "branch", "-r"]);
    const remoteBranches = remoteBranchesOutput.trim().split('\n').map(branch => branch.trim().replace('origin/', ''));

    for (const branch of remoteBranches) {
        if (branch === '' || branch.includes("HEAD") || branch === baseBranch) continue; // Skip certain branches

        const hasConflicts = await hasMergeConflicts(branch, baseBranch);
        if (hasConflicts) {
            conflictingBranches.push(branch);
        }
    }

    return conflictingBranches;
}

if (import.meta.main) {
    let branchToCompare = "main"; // Default branch
    const branchArgIndex = args.indexOf("-b");

    if (branchArgIndex !== -1 && args[branchArgIndex + 1]) {
        branchToCompare = args[branchArgIndex + 1];
    }

    getConflictingBranches(branchToCompare).then(conflicts => {
        if (conflicts.length === 0) {
            console.log("All clear - no conflicts detected.");
        } else {
            console.log(`The following branches have conflicts with ${branchToCompare}:`);
            conflicts.forEach(branch => console.log(`- ${branch}`));
        }
    }).catch(error => {
        console.error("Error occurred:", error.message);
    });
}
