const core = require('@actions/core');
const github = require('@actions/github');

const extractJiraKeys = (str) => {
    const jiraKeyRegex = /\b[A-Z]{2,}-\d+\b/g;
    const matches = str.match(jiraKeyRegex);
    return matches || [];
};

const extractUniqueJiraKeys = (array) => {
    return [...new Set(array)];
};

async function run() {
    try {
        const githubToken = core.getInput('github-token', { required: true });
        const filter = core.getInput('filter', { required: false }) || 'all';
        const octokit = github.getOctokit(githubToken);

        const context = github.context;

        const { owner, repo } = context.repo;
        const { number } = context.issue;
        const { sha } = context.sha;

        let prKeys = [];
        let commitKeys = [];
        let branchKeys = [];

        if(context.eventName === 'pull_request') {
            const { data: pr } = await octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: number,
            });

            prKeys.push(...extractJiraKeys(pr.title));
            branchKeys.push(...extractJiraKeys(pr.head.ref));
        } else if (context.eventName === 'push') {
            const branchName = process.env.GITHUB_REF.split('/').pop();
            branchKeys.push(...extractJiraKeys(branchName));
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
