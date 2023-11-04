# git-yield ⚠️
Git Yield is a small utility, less than 100 LOC, that gives you the benefits of trunk-based development while using long-lived feature branches.

**Background**

Long-lived feature branches suffer from painful integrations due to a lack of transparency between branches. A feature branch only sees what other branches are doing after they merge into main. Because of the way complex systems work, the longer feature branches live, the higher the likelihood two branches will have conflicts when merging.

The industry solution has been to use trunk-based development, where everyone either pushes every commit directly to main/trunk, or everyone creates small, short-lived feature branches that integrate back into trunk on a daily basis (if not sooner). This solves the problem of transparency, but at the cost of increased process, a prerequisite testing and feature-flag strategy, ad-hoc code-review, and new configuration.

Git Yield is designed to work with git's branching feature while enabling transparency, and to do so elegantly using as little boilerplate as possible.

---
**How it works**

Deps: [Deno](https://deno.com/)

The utility is really just a pattern of using git:

1. Fetch origin
2. Iterate branches running `$git merge --abort`
3. Capture conflicting branches

If the data structure is not empty - fail the pipeline and alert your team with the results. Swarm and integrate.

The utility was created to provide two primary benefits:
1. A simple data structure to capture the conflicts and report status.
2. A binary (run `$deno compile --allow-all git-yield.ts`) that extends git and can be dropped into your CI/CD pipeline.

---
**Caveats**
As it stands the utility works under the two happy path scenarios:

```
Scenario: Conflicts
Given you have a remote repo with multiple branches
And you can fetch those branches
And those branches have conflicts
When you run $git yield -b branchname
Then you will get a list of branches that are in conflict

Scenario: No Conflicts
Given you have a remote repo with multiple branches
And you can fetch those branches
And those branches do not conflict
When you run $git yield -b branchname
Then you will get the message: "All clear - no conflicts detected."
```

It has not been made robust to deal with alternate scenarios or provide elegant error messaging.

---
**Examples**

```
$ git yield -b featureWithConflicts

🚨 The following branches have conflicts with featureWithConflicts:
- featureA
- bugC
```
```
$ git yield -b featureWithoutConflicts

✅ All clear - no conflicts detected.

```
