const core = require('@actions/core');
const github = require('@actions/github');

function extractJiraKeys(text) {
    const jiraKeyPattern = /\b[A-Z][A-Z0-9]*-[0-9]+\b/g;
    const result = text.match(jiraKeyPattern);
    return result || [];
}

function extractUniqueJiraKeys(keys) {
    return [...new Set(keys)];
}

async function run() {
    try {
        const githubToken = core.getInput('github-token', { required: true });
        const filter = core.getInput('filter', { required: false }) || 'all';
        const octokit = github.getOctokit(githubToken);

        const context = github.context;

        const { owner, repo } = context.repo;
        const { number } = context.issue;

        let prKeys = [];
        let commitKeys = [];
        let branchKeys = [];

        let sha;
        if(context.eventName === 'pull_request') {
            const { data: pr } = await octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: number,
            });

            prKeys.push(...extractJiraKeys(pr.title));
            branchKeys.push(...extractJiraKeys(pr.head.ref));

            sha = pr.head.sha;
        } else if (context.eventName === 'push') {
            const branchName = process.env.GITHUB_REF.split('/').pop();
            branchKeys.push(...extractJiraKeys(branchName));

            sha = context.sha;
        }

        const { data: commitData } = await octokit.rest.repos.listCommits({
            owner,
            repo,
            sha,
        });

        commitData.forEach((commit) => {
            commitKeys.push(...extractJiraKeys(commit.commit.message));
        });

        let jiraKeys = [];
        if (filter === 'all' || filter === 'pr') jiraKeys.push(...prKeys);
        if (filter === 'all' || filter === 'commit') jiraKeys.push(...commitKeys);
        if (filter === 'all' || filter === 'branch') jiraKeys.push(...branchKeys);

        jiraKeys = extractUniqueJiraKeys(jiraKeys);

        core.setOutput('jira-keys', jiraKeys.join(', '));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
